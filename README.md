# Ticketiv

Ticketiv is an event-ticketing platform for Eswatini and the wider region:
consumer discovery and checkout, an organizer back office (events, pricing,
finance, payouts), an offline-first gate scanner, resale and waitlist flows, and
a super-admin command centre. It runs as a Next.js App-Router application on
Vercel, backed by Supabase (Postgres + Auth + Storage) with row-level security
and `SECURITY DEFINER` RPCs for every mutation.

> This README describes the system as it actually is. For agent/contributor
> conventions (design system, Supabase rules, key RPCs, do-not-do list) see
> [`CLAUDE.md`](./CLAUDE.md).

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Runtime | React 19.2 / Node 22 |
| Language | TypeScript 5.7+ |
| Styling | Tailwind CSS 4.x (`@tailwindcss/postcss`) + **Quiet UI**, a bespoke design system (`components/quiet/ui/`) — *not* shadcn/ui |
| Package manager | **pnpm 10.28** (workspace) — never `npm`/`yarn` |
| Backend | Supabase (Postgres, Auth, Storage; project `radsfmlsjznqvcpogluo`) |
| Payments | Paystack (card + provider webhook) and mobile-money (MoMo) callbacks; DeltaPay/Flutterwave adapters are scaffolded but not enabled |
| Errors | Sentry (`@sentry/nextjs`) |
| Deployment | Vercel (builds from the repo root) |

### Monorepo layout

A pnpm workspace. The Next.js web app lives at the **repo root** (Vercel's root
directory — do not move it without updating the Vercel setting). Platform-neutral
logic lives in `packages/shared` (`@ticketiv/shared`, consumed by web via
`transpilePackages`); `packages/tokens` holds Quiet UI tokens for the React
Native apps (`apps/ticketiv` consumer, `apps/access` staff). See
`docs/adr/0001-mobile-packaging.md`.

```
app/
  (public)/       Public discovery (events, artists, venues, search)
  (consumer)/     Buyer journeys (tickets, waitlist, resale, notifications)
  (focused)/      Checkout and post-purchase
  (scanner)/      Gate scanner (offline-first PWA)
  (app)/          Auth'd user shell (profile, payments)
  orgs/[orgId]/   Organizer workspace (events, orders, staff, devices, finance, payouts)
  super-admin/    Admin command centre (audit, exports, flags, routing, payouts)
  api/            Route handlers (attendee CSV, exports, scanner, payments/paystack/webhook)
components/quiet/ Design system primitives, screens, shells
lib/              supabase/ clients · data/ access layer · scanner/ · payments*
supabase/
  migrations/     Timestamped SQL migrations (source of truth for the schema)
  schema/         Baseline structure snapshot
scripts/          verify-rls.sql · verify-money-path.sql · smoke/checks
e2e/              Playwright browser tests
```

### Data-access rules (hard rules)

1. **All mutations go through `SECURITY DEFINER` RPCs** — never client-side
   `insert`/`update` on protected tables.
2. **Reads are RLS-scoped.** Policies use the canonical `app.*` helpers
   (`app.is_org_admin_of`, `app.is_platform_admin`, `app.is_event_public_now`,
   …) and the `(select auth.uid())` scalar pattern.
3. Three Supabase clients: `createClientSupabaseClient()` (browser / anon or
   authenticated), `createServerSupabaseClient()` (server components / route
   handlers, cookie session), `createAdminClient()` (service-role — trusted
   server + webhooks only, bypasses RLS).
4. Never expose the service-role key, `details_encrypted` columns, or provider
   secrets to the browser.

---

## Environment matrix

Provided via the deployment environment (Vercel) or a local `.env.local`. There
are no hardcoded fallbacks except `NEXT_PUBLIC_APP_URL`.

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | ✅ | Anon/browser key (RLS-scoped) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | ✅ (server) | Service-role key for trusted RPCs/webhooks |
| `NEXT_PUBLIC_APP_URL` | public | – | Canonical app URL (default `http://localhost:3000`) |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | server | ✅ (payments) | Paystack API + webhook signature secret |
| `DELTAPAY_*`, `FLUTTERWAVE_*` | server | – | Scaffolded adapters, not enabled |
| `GOOGLE_MAPS_EMBED_KEY` | server | – | Venue map embeds |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | both | – | Error reporting |
| `NEXT_PUBLIC_ENABLE_DEMO_MODE` / `NEXT_PUBLIC_ENABLE_ANALYTICS` | public | – | Feature flags |

Provider keys can also be stored per-provider in the `payment_provider_settings`
table; the code falls back to env when a provider row is disabled.

---

## Roles and permissions

**Platform admin tiers** (in `admin_users.role_tier`), highest to lowest:
`super_admin` > `finance_admin` > `support_admin` > `event_ops_admin` >
`read_only_admin`. Gate with `requireAdminRole(...)`; mutations require
`roleTier !== "read_only_admin"`.

**Org / event roles** (`app_role` enum): `organizer_owner`, `organizer_admin`,
`organizer`, `organizer_staff`, `finance`, `scanner`, `organizer_scanner`,
`pos`, plus platform/domain roles `admin`, `venue`, `artist`, `attendee`,
`device`. Membership lives in `org_members` (org-wide) and `event_staff`
(per-event). Authorization is enforced inside RPCs/policies via the `app.*`
helpers and legacy `can_manage_org` / `can_manage_event` helpers.

Guest checkout uses the plain Supabase **`anon`** role (no sign-in), which is
distinct from anonymous auth.

---

## Payment lifecycle

Money is stored as **integer cents** in `_cents` columns; display as
`SZL X,XXX.XX` with locale `en-SZ`.

1. **Order creation** — `fn_create_inventory_protected_order` (service-role)
   locks inventory, applies pricing, and creates a `pending` order + items +
   a `pending` payment and `payment_attempt`. Pricing/fees are computed by
   `app.recompute_order_totals`; the org's active `pricing_plans` row decides
   platform/processor fees and who pays them.
2. **Provider payment** — the buyer pays via Paystack (or a MoMo callback).
3. **Completion is provider-verified and trusted-only.** The Paystack webhook
   (`app/api/payments/paystack/webhook`) verifies an HMAC-SHA512 signature, then
   `completeTrustedPaystackWebhook` (service-role) marks the payment
   `succeeded`, writes the **settlement ledger** (`order_gross = total`,
   negative `fee` rows, `payment_net`), issues tickets, and flips the order to
   `paid`. It is **idempotent**: payments are keyed on `(provider,
   ext_payment_id)`, ledger rows are written once per payment, and a re-marked
   order returns early. The `payments` table has no `authenticated`/`anon` write
   policy, so only trusted server code can record a succeeded payment.
4. **Finance & payouts** — `fn_org_finance_summary` is the single source of
   truth for org money (gross/fees/net/available/settled). Payouts go through
   `fn_request_payout` (gated on org admin + a payout account) into the admin
   payout queue.

Refunds (`refunds`, `refund_items`) and payouts (`payouts`, `payout_accounts`)
are modelled as ledger movements. See `docs/PAYMENTS.md` and
`scripts/verify-money-path.sql` (a rolled-back, read-safe end-to-end money-path
check runnable against any environment).

---

## State machines

**Event** (`events.status`, enum `event_status`):
```
draft ──publish──▶ published ──▶ archived
  ▲                   │
  └───── paused ◀──────┘        (paused = temporarily off sale)
```

**Order** (`orders.status`, enum `order_status`):
```
pending ──payment succeeded──▶ paid ──refund──▶ refunded
   └──────payment failed──────▶ failed
```
Order status is set explicitly by the completion code / RPCs (there is no
ledger→status auto-sync). Totals are locked once an order is `paid`.

**Ticket / order item** (`order_items.status`, enum `order_item_status`):
```
pending ──order paid──▶ issued ──scan──▶ checked_in
                          │  └──transfer/resale──▶ transferred ──scan──▶ checked_in
                          └──────────────▶ revoked | refunded   (terminal)
```
Transitions are enforced by `order_items_status_transition_guard`; gate scans go
through `fn_scan_ticket`, which authorizes the caller (staff / event_staff /
device session), is idempotent, and enforces one-time use per ticket.

---

## Local development

**Toolchain.** Node **22.x** (`.nvmrc`) and pnpm **10.28.0** (`packageManager`).
`engine-strict=true` is set, so `pnpm install` *fails* rather than warns on the
wrong Node — if you see `ERR_PNPM_UNSUPPORTED_ENGINE`, switch versions first:

```bash
nvm use            # or: fnm use / asdf install — reads .nvmrc
corepack enable    # pins pnpm to the version in packageManager
```

```bash
pnpm install                 # install workspace deps
cp .env.example .env.local   # then fill in the Supabase + Paystack values (see matrix)
pnpm dev                     # start the web app on http://localhost:3000
```

Quality gates (the same `check:release` chain runs in CI):

```bash
pnpm lint             # eslint
pnpm test             # vitest (unit)
pnpm check:mobile     # mobile app/adapters package tests + typechecks
pnpm typecheck        # tsc --noEmit
pnpm check:demo       # guards against placeholder/demo patterns
pnpm check:permissions   # RPC grant matrix vs. the committed snapshot
pnpm check:service-role  # service-role key never reachable from a browser path
pnpm check:crossorg      # cross-org authorization on org-scoped routes
pnpm check:routes        # internal route guards
pnpm build            # next build
pnpm check:release # all of the above, in that order

pnpm test:e2e          # Playwright (see e2e/); set PLAYWRIGHT_BASE_URL to a target
pnpm test:e2e:install  # install the chromium browser
```

The public-leg E2E (discover → event detail) runs against `PLAYWRIGHT_BASE_URL`;
the authenticated checkout → ticket → scan legs self-skip until a seeded staging
DB + test-mode Paystack are configured (`E2E_TEST_BUYER_EMAIL`,
`E2E_PAYSTACK_TEST_KEY`). CI runs both the release gate and an E2E smoke job (see
`.github/workflows/ci.yml`).

### Test data

There is no committed seed pack yet; the live project holds catalogue/setup data
(events, ticket types, orgs, venues) but little transactional data. Use
`scripts/verify-rls.sql` and `scripts/verify-money-path.sql` (rolled-back,
read-safe) to exercise RLS isolation and the money path against a real
environment without persisting anything, and see `docs/UAT_TEST_PLAN.md` for the
manual UAT matrix. For manual UAT data that must persist long enough to capture
evidence, mark every row-producing journey with a lowercase `uat-...` run id and
dry-run `scripts/cleanup-uat-fixtures.sql` before applying cleanup.

---

## Database migrations

Migrations live in `supabase/migrations/` as `YYYYMMDDHHMMSS_slug.sql` and are
the source of truth for the schema. They are applied to the Supabase project via
the Supabase tooling (`apply_migration`) and recorded in
`supabase_migrations.schema_migrations`; the repo file and the recorded version
are kept in lockstep. Do **not** run raw `psql` against production. See
`docs/MIGRATION_RECONCILIATION.md` and `supabase/MIGRATION_TEMPLATE.md`.

---

## Deployment and rollback

- **Deploy:** Vercel builds from the repo root on merge to `main`. Database
  changes ship as migrations (above) applied to the Supabase project.
- **Rollback (app):** redeploy a previous successful Vercel build (Vercel →
  Deployments → Promote), or revert the offending commit and let CI redeploy.
- **Rollback (schema):** write and apply a forward migration that reverses the
  change (preferred), or restore from a Supabase point-in-time backup for data
  loss. Because migrations are timestamp-preserving and recorded, never edit a
  released migration in place — add a new one.
- **Release gate:** a PR is mergeable only when the `check:release` CI job is
  green (lint, unit tests, typecheck, demo-pattern check, build).

---

## Further reading

`CLAUDE.md` · `docs/PAYMENTS.md` · `docs/RUNBOOK.md` · `docs/UAT_TEST_PLAN.md` ·
`docs/RBAC_IMPLEMENTATION.md` · `docs/adr/` · `scripts/verify-*.sql`
