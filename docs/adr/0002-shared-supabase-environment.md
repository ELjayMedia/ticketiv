# ADR 0002 — One Supabase project for development, UAT and production

**Status:** Accepted · 2026-07-25
**Supersedes the environment-separation approach originally scoped in TICK-342.**

## Decision

Ticketiv runs development, UAT and production against a **single Supabase
project** (`radsfmlsjznqvcpogluo`) and a **single Vercel project**
(`v0-ticketiv`). We are not provisioning separate Supabase projects or branches
per environment.

## Why

Cost. Supabase's free tier covers one project; separate UAT and production
projects, or persistent database branches, move the platform onto a paid plan
before it has taken a single real payment. At current scale — one organization,
pre-launch — the spend is not justified.

## What this costs us

This is a real trade-off, not a free one. Consequences to keep in view:

- **Preview deployments read and write production data.** Every branch preview
  on Vercel resolves the same `NEXT_PUBLIC_SUPABASE_URL`. A destructive
  migration or a careless script run from a feature branch hits the live
  database. There is no separate blast radius.
- **UAT records are production records.** Test orders, test scans and test
  payouts land in the same tables real ones will, and will need to be
  distinguishable and removable at launch.
- **A live payment key is live everywhere.** There is no environment boundary to
  keep an `sk_live_` key away from a preview build.
- **No migration rehearsal target.** Migrations are applied straight to the one
  environment; there is nowhere to prove one before it matters.

## Compensating controls

Because the environment boundary does not exist, the controls have to sit in
code and process:

1. **Live payment keys are refused by default.** `getPaystackSettings()` throws
   on an `sk_live_` key unless `PAYSTACK_ALLOW_LIVE_MODE=true` is also set.
   Going live is a deliberate two-part change, so a live key cannot arrive by
   accident on a preview build. Keys stay on `sk_test_` until the money path
   passes UAT (TICK-61, gated on TICK-335).
2. **Permission drift is checked, not assumed.** `pnpm check:permissions`
   diffs the live RPC grant surface against `supabase/permissions/rpc-grants.json`
   on every PR, so a change applied directly to the shared database without a
   migration fails CI (TICK-337).
3. **Migrations are reviewed as production changes**, because they are. Every
   migration is applied via Supabase `apply_migration` with the reasoning
   written into the file, and destructive ones list affected rows by explicit ID
   rather than by negation (see
   `20260725120000_cleanup_seeded_orgs_for_uat.sql`).
4. **Production smoke tests must be non-destructive.** The E2E suite runs
   against this environment, so it cannot create-and-truncate. Fixtures need to
   be additive and identifiable (TICK-334, TICK-341).

## Revisit when

Any of these should reopen the decision:

- Real customer money is flowing and an outage or data loss has commercial cost.
- More than one organization depends on the platform.
- A migration or test run causes production data loss — at that point the paid
  tier is cheaper than the incident.

At that point the migration path is a second Supabase project for production
with this one demoted to UAT, plus per-environment Vercel variables. The
compensating controls above stay useful either way.
