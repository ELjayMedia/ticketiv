# TypeScript Error Burndown (TICK-175) — COMPLETE

Snapshot: 2026-06-20. `npx tsc --noEmit` is **clean (0 errors)**.
`next.config.mjs` now has `typescript.ignoreBuildErrors: false` and the CI
`Typecheck` step is **blocking** (no more `continue-on-error`). Type
regressions now fail CI and the Vercel build.

## Count

- Start of session: 243 → 233 (after the pricing decouple) → **0**.

## How it was burned down

The bulk of the errors traced to **v0-generated data modules that queried
columns the live schema never had**, plus app code lagging the Next 16
async-`params` change. Work fell into five buckets:

1. **Deleted dead/divergent duplicate modules** (zero importers, all querying
   non-existent columns):
   - `lib/data/orders.ts` (dup of `lib/data/attendee/orders.ts`)
   - `lib/data/profiles.ts`, `lib/data/public/profiles.ts` (`profiles` has no
     `org_id`)
   - `lib/data/events.ts`, `lib/data/public/events.ts` (canonical path is the
     `lib/adapters/events.ts` view reader)
   - `lib/data/organizer/{checkout,finance,settings,operations}.ts`
   - `components/events/event-card.tsx` (shadcn-based; replaced by the
     Quiet-UI `EventCardStandard`)
   Their barrel re-exports were dropped from the `lib/data/{public,organizer}`
   and `attendee` index files.

2. **Column-name / enum drift fixed against the real schema:**
   - `events.date` → `starts_at` (no `date` column)
   - `price_rules.value` → `value_numeric`; type enum uses
     `absolute_discount|percent_discount|abs_fee|percent_fee|tax`
   - `order_items.status` `"scanned"` → `"checked_in"`
   - payment status `"paid"` → `"succeeded"`, refund status `"pending"` →
     `"requested"`
   - `ticket_types` insert dropped non-existent `description`, `sale_start_at`,
     `sale_end_at`, `is_active`
   - `profiles` row mapped into the `auth.UserProfile` shape (id/email/full_name)
   - dashboard KPIs aligned to `v_event_kpis` (`title`, `tickets_issued`,
     `tickets_checked_in`, `revenue_cents`)

3. **Hand-written record interfaces relaxed to match generated nullability:**
   `Artist`, `Transfer`, `PriceRule`, `FeatureFlag`, `OrgPayoutRow`,
   `OrgPayoutAccount`, wallet `Payment`, `WaitlistRecord`.

4. **Null-safety sweep:** guarded nullable `useSearchParams()` / `usePathname()`
   / `useParams()` across client components; passed `undefined` (not `null`) to
   RPC string params (auth callbacks, POS charge, venue create, guestlist).
   `Json` columns (`changes`, `config`, `recurrence_pattern`, payload `.kind`)
   are now cast through the generated `Json` type.

5. **Next 16 async `params` migration:** every dynamic route segment
   (`page.tsx` / `route.ts` / `layout.tsx` under `[param]` dirs) now types
   `params: Promise<…>` and `await`s it (client `team/invite` uses React
   `use()`). This cleared the generated `.next/types` `PageProps`/`RouteContext`
   validator errors.

## Verification

- `npx tsc --noEmit` → 0 errors.
- `pnpm test` → 13/13 passing.
- `next build` compiles past type-checking; in the offline sandbox it only
  fails fetching Google Fonts (network), which CI/Vercel resolve.

## Guard rails now in place

- `next.config.mjs`: `typescript.ignoreBuildErrors: false`.
- `.github/workflows/ci.yml`: `Typecheck` runs `npx tsc --noEmit` with no
  `continue-on-error` — type errors block PRs and pushes.

## Follow-ups (non-blocking, tracked separately)

- Some dynamic admin reads use `.from(resource.table as any)` because the table
  name is runtime-dynamic; that is inherent to the generic admin CRUD and is
  cast deliberately.
- A few CSV export selects cast through `unknown` because PostgREST returns a
  `GenericStringError` type for joined-string `.select()` calls.
