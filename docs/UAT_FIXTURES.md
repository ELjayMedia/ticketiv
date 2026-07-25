# UAT fixtures and test personas

**TICK-341.** Repeatable, identifiable transactional data for testing against
the shared environment.

## Running it

```sql
select public.fn_seed_uat_fixtures();      -- seed (idempotent: re-seeding resets)
select public.fn_teardown_uat_fixtures();  -- remove every fixture
```

Both are `service_role` only. Seeding calls teardown first, so running it twice
produces the same database rather than duplicates — verified.

## Why identifiability, not isolation

The ticket asked for a seed tool for "a dedicated non-production environment"
and required that "production cannot run the seed tool accidentally".

**There is no dedicated non-production environment.** Development, UAT and
production share one Supabase project to stay on the free tier
(`docs/adr/0002-shared-supabase-environment.md`). That criterion cannot be met
as written, so the safety property had to be built a different way:

- Every fixture has a **fixed, hardcoded UUID** in the `da7a…` range. Tests can
  depend on the ids, and nothing else in the database can collide with them.
- Teardown deletes **only those explicit ids**. It never deletes by negation
  ("everything except…"), which is what makes it safe on a database that also
  holds a real tenant. Verified: after a teardown, the real organization, event
  and users were untouched and every fixture was gone.
- Personas use `@uat.ticketiv.invalid` — a reserved TLD that can never receive
  mail, so no fixture can email a real person.
- Seeded events are **`unlisted`**, not `public`. `v_events_public` filters on
  `visibility = 'public'`, so fixtures are reachable by direct URL for testing
  but never appear in discovery, search or on the live site. This is the exact
  mistake the 25 July cleanup had to undo by hand, when seeded demo festivals
  were found live on the events index.

## Personas

All are members of **UAT Alpha Events** unless noted.

| Persona | Role | UUID |
|---|---|---|
| `uat-owner@uat.ticketiv.invalid` | `organizer_owner` | `da7a0001-…-0001` |
| `uat-admin@uat.ticketiv.invalid` | `organizer_admin` | `da7a0001-…-0002` |
| `uat-finance@uat.ticketiv.invalid` | `finance` | `da7a0001-…-0003` |
| `uat-scanner@uat.ticketiv.invalid` | `organizer_scanner` | `da7a0001-…-0004` |
| `uat-cashier@uat.ticketiv.invalid` | `pos` | `da7a0001-…-0005` |
| `uat-buyer1@uat.ticketiv.invalid` | attendee | `da7a0001-…-0006` |
| `uat-buyer2@uat.ticketiv.invalid` | attendee | `da7a0001-…-0007` |
| `uat-beta-owner@uat.ticketiv.invalid` | `organizer_owner` of **Beta** | `da7a0001-…-0008` |

Two organizations exist so cross-tenant tests have a real counterpart: **Alpha**
(`da7a0000-…-0001`) and **Beta** (`da7a0000-…-0002`).

**These personas have no passwords.** They exist as `auth.users` rows for
server-side and SQL-level testing. Browser-driven E2E that needs to sign in will
have to set credentials or use magic links — worth resolving as part of
TICK-334.

## Order lifecycle covered

| Fixture | State | What it exercises |
|---|---|---|
| `da7a0005-…-0001` | **paid** | Completed through `fn_complete_order_payment`, so payment, balanced ledger, issued tickets and the outbox row are written by real code. One ticket is already `checked_in` with a `scans` row. |
| `da7a0005-…-0002` | **pending, live hold** | Holds inventory; expires in 9 minutes |
| `da7a0005-…-0003` | **pending, stale hold** | Past its window — what the expiry sweeper collects |
| `da7a0005-…-0004` | **failed** | Abandoned checkout |
| `da7a0005-…-0005` | **refunded** | Driven through the refunds trigger, so `refund_items`, the reversing ledger entry and ticket voiding are all real |
| `da7a0005-…-0006` | **discrepancy** | See below |

Alpha carries a real pricing plan (6.5% platform, 2.9% + 100c processor,
buyer-paid) so fee arithmetic is exercised rather than defaulting to zero.
Also seeded: a venue, a published/unlisted event, a draft event, GA and VIP
ticket types, a payout account and a requested payout.

## The discrepancy fixture is deliberate

`da7a0005-…-0006` is a **paid order with a succeeded payment and no ledger
entries**. It is inconsistent on purpose: it is the fixture reconciliation work
(TICK-340) is meant to *find*.

It is the one fixture that will not satisfy the money invariants. Anything that
asserts "every paid order has balanced ledger entries" must exclude it
explicitly, or it will report a real-looking failure that is actually the test
data doing its job.

## Retention and teardown

Fixtures persist until `fn_teardown_uat_fixtures()` is called — there is no
automatic expiry, deliberately, so a test run does not race a cleanup job.

**Before launch, run the teardown.** Fixture orders and payments would otherwise
appear in finance summaries and reconciliation exports alongside real ones. They
are invisible to buyers (unlisted events), but they are not invisible to
reporting.
