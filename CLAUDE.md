# Ticketiv — Claude Code Guide

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React Server Components) |
| Runtime | React 19.2 / Node 22 |
| Language | TypeScript 5.7+ |
| Styling | Tailwind CSS 4.x via `@tailwindcss/postcss` |
| Package manager | **pnpm 10.28** — never use `npm install` or `yarn` |
| Backend | Supabase (project `radsfmlsjznqvcpogluo`) |
| Deployment | Vercel |

## Design system — Quiet UI

The project uses a bespoke **Quiet UI** design system, not shadcn/ui. Do not use shadcn component names, `bg-background`, `text-foreground`, or any shadcn token.

### Components (always import from `@/components/quiet/ui/`)
- `Card`, `CardBody`, `CardDivider`
- `Button` — variants: `default | primary | accent | ghost | outline`, sizes: `xs | sm | md | lg`
- `Chip` — variants: `default | active | accent | muted`
- `Icon` — import `IconName` type too; valid names: `search heart bell user pin cal ticket share filter chevR chevL chevD chevU plus minus arrowR arrowUR close check map music spark copy fire zap globe wallet qr clock fileText download trash settings trending users globe`
- `FormField` — controlled input with label

### CSS design tokens (use these, not Tailwind defaults)
```
bg-bg          bg-surface        bg-surface-2
text-ink       text-ink-2        text-ink-3        text-ink-4
border-line    border-line-2
text-accent    bg-accent-soft
text-danger    bg-danger-soft
text-warning
var(--radius)  var(--radius-md)  var(--radius-lg)  var(--radius-xl)
var(--shadow-card)
```

### Typography utilities
```
text-h1   text-h2   text-h3   text-label
font-mono text-[11px] uppercase tracking-wider   ← mono meta labels
font-mono text-[22px] font-semibold tabular-nums ← big numbers
```

## Supabase conventions

### Client helpers
```ts
createServerSupabaseClient()   // server components / route handlers
createClientSupabaseClient()   // client components ('use client')
createAdminClient()            // service-role, admin pages only
```

### Security rules (hard rules — never violate)
1. **All data mutations go through SECURITY DEFINER RPCs** — never raw client-side `insert`/`update` on protected tables.
2. **RLS pattern**: use `(select auth.uid())` (scalar subquery) not `auth.uid()` directly — keeps the planner's InitPlan optimization.
3. Reads are RLS-scoped. Do not add `service_role` to browser paths.
4. Never expose `details_encrypted` fields or provider secrets to the browser.

### Money
- Stored as integer cents in `_cents` columns.
- Display format: `SZL X,XXX.XX` (locale `en-SZ`).
- Helper: `(cents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })`.

### Migrations
Files live in `supabase/migrations/` with prefix `YYYYMMDDHHMMSS_slug.sql`.
Apply via Supabase MCP `apply_migration` — never raw `psql` on VPS.

## Project layout (key paths)

```
app/
  (consumer)/          # Buyer-facing journeys (tickets, waitlist, resale, notifications)
  (focused)/           # Checkout and post-purchase flows
  (public)/            # Public discovery (events, artists, venues, search)
  (scanner)/           # Gate scanner (offline-first PWA)
  (app)/               # Auth'd user shell (profile, payments)
  orgs/[orgId]/        # Organizer workspace
    dashboard/         # Org dashboard with onboarding checklist
    events/[eventId]/  # Event editor, orders, staff, devices, scanner, guestlist
    finance/           # Finance summary (fn_org_finance_summary RPC)
    payouts/accounts/  # Payout account setup
  super-admin/         # Admin command centre
    audit/             # Audit log viewer
    exports/           # CSV reconciliation exports
    flags/             # Feature flag management
    routing/           # Payment routing rules
    payments/          # Payment failure investigation
    payouts/           # Admin payout queue
api/
  orgs/[orgId]/events/[eventId]/attendees.csv/
  super-admin/exports/[kind]/
  scanner/events|manifest|scans/
  payments/paystack/webhook/
components/
  quiet/ui/            # Design system primitives
  quiet/screens/       # Full-page screen components (server/client split)
  quiet/shell/         # Workspace shells
lib/
  supabase/            # Supabase client factories
  super-admin/         # Admin auth, permissions, command-centre data
  data/                # Data access layer (admin/, organizer/, attendee/, public/)
  scanner/             # Scanner manifest, session, outcome helpers
supabase/migrations/   # Database migrations (timestamped SQL files)
```

## Admin role tiers
`super_admin` > `finance_admin` > `support_admin` > `event_ops_admin` > `read_only_admin`

Use `requireAdminRole(ADMIN_ROLE_TIERS)` — returns `{ user, roleTier }`.
Gate mutations with `const canAct = roleTier !== "read_only_admin"`.

## Org member roles
`organizer_owner | organizer_admin | organizer | admin | organizer_staff | staff | scanner | member`

## Key RPCs
| RPC | Purpose |
|---|---|
| `fn_org_finance_summary(p_org_id)` | Single source of truth for org money figures |
| `fn_request_payout` | Payout request gated on org admin + payout account |
| `create_event_draft` | Create event, returns event ID |

## Important — what NOT to do
- Never `npm install` — use `pnpm add` if adding a dep (but avoid adding deps).
- Never import from `@/components/ui/` (legacy shadcn path) — always `@/components/quiet/ui/`.
- Never use `<Icon name="circle" />`, `<Icon name="x" />`, `<Icon name="arrowL" />` — not in the icon map. Use `chevL`, `close`, or a `<span>` instead.
- Never use `bg-background`, `text-foreground`, `text-muted-foreground`, `bg-muted` — these are shadcn tokens not present in Quiet UI.
- Never add `service_role` key to client-side code.
- Never expose `details_encrypted` column values to the browser.
