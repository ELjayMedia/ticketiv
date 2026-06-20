# TypeScript Error Burndown (TICK-175)

Snapshot: 2026-06-20. `npx tsc --noEmit` after the pricing decouple.
next.config.mjs still has `typescript.ignoreBuildErrors: true` — DO NOT flip
it until the count reaches ~0, or the Vercel build breaks.

## Count

- Start of session: 243
- Now: 233
- Fixed: pricing.ts preview calculator decoupled from the DB record via a
  local `PricingTicketType` interface (10 errors: 3 in pricing.ts, 7 in its test).

## Remaining by error code

```
     76 error TS2322
     33 error TS2344
     29 error TS2339
     28 error TS2345
     18 error TS18047
     14 error TS18048
     13 error TS2769
      5 error TS2741
      5 error TS2352
      3 error TS2739
      3 error TS2367
      3 error TS1205
      2 error TS7053
      1 error TS2307
```

## Remaining by file (top 30)

```
     14 lib/data/organizer/checkout.ts
     13 app/orgs/[orgId]/events/page.tsx
      7 lib/data/orders.ts
      7 components/events/event-card.tsx
      6 lib/data/public/search.ts
      6 components/quiet/screens/tickets/ticket-view.tsx
      5 lib/data/public/profiles.ts
      5 lib/data/profiles.ts
      5 lib/data/events.ts
      5 lib/data/attendee/transfers.ts
      5 lib/data/artists.ts
      5 components/quiet/screens/event-detail/live-event-shell.tsx
      5 components/OtpForm.tsx
      5 .next/types/validator.ts
      4 lib/data/public/events.ts
      4 lib/data/organizer/finance.ts
      4 app/super-admin/[resource]/page.tsx
      4 app/api/ticket-types/route.ts
      4 app/
      3 lib/data/organizer/settings.ts
      3 lib/data/attendee/index.ts
      3 lib/data/admin/controls.ts
      3 components/ui/mobile-shell.tsx
      3 components/event-management-tabs.tsx
      3 app/super-admin/actions.ts
      3 app/orgs/[orgId]/events/[eventId]/pos/actions.ts
      3 app/api/events/[eventId]/venue/route.ts
      3 .next/types/app/
      2 lib/providers/permissions-provider.tsx
      2 lib/promo-codes.ts
```

## Semantic landmines (fix carefully — these are real bugs, not cosmetics)

These reveal app code referencing columns that do not exist in the current
schema. Each needs reconciliation against the live DB, NOT a blind rename —
several sit on the money/POS path.

1. **pricing.ts cents-vs-units** — the preview calculator works in decimal
   currency units with fixed fees like `+1.79`, while the platform stores money
   as integer `_cents`. It is currently dead (only `formatCurrency` is consumed).
   Needs a product decision before wiring to real checkout.
2. **price_rules shape** (`lib/data/organizer/checkout.ts`) — code reads `.value`
   and compares type against `"percentage"`/`"fixed"`, but the table has
   `value_numeric` and enum `absolute_discount|percent_discount|abs_fee|percent_fee|tax`.
3. **payments shape** (checkout.ts, orders.ts) — code reads `.amount` /
   `.total_amount` / `provider_reference` and uses status `"initiated"`; the
   table has `amount_cents`, no `total_amount`/`provider_reference`, and status
   `pending|succeeded|failed|refunded`.
4. **OrderItemRecord / OrderRecord app interfaces** (`types/index.ts`,
   `lib/data/orders.ts`) — declare `unit_price_cents`, `total_amount_cents`,
   `event_id`, `quantity`, `purchaser_*`, `subtotal_amount` that the actual
   `.select()` rows don't return → assignability failures.

## Recommended plan

1. Regenerate Supabase types (`generate_typescript_types`) as the source of truth.
2. Reconcile the app-level interfaces in `types/index.ts` to match (or replace
   them with the generated row types) — fixes the bulk of TS2322/TS2344.
3. Fix the financial-core files first against real columns, verifying the POS
   charge + order read paths still behave (covered by TICK-174 tests as they grow):
   `lib/data/organizer/checkout.ts`, `lib/data/orders.ts`, `lib/data/public/search.ts`.
4. Sweep the null-safety errors (TS18047/18048) across the app pages.
5. Only when the count is ~0: set `ignoreBuildErrors: false` and make
   `tsc --noEmit` a blocking CI gate (the CI step is already wired, currently
   `continue-on-error: true`).
