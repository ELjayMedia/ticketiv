# Claimed-account authorization boundary

Ticketiv supports guest checkout by creating anonymous Supabase Auth users. Those users receive the same `authenticated` Postgres role as permanent accounts, so `auth.uid()` and `to authenticated` do not distinguish a recoverable account from a guest session.

The migration `20260721163000_claimed_account_guard.sql` introduces the canonical boundary:

- `app.is_claimed_account()` returns true only when a user exists and the trusted JWT `is_anonymous` claim is explicitly false.
- `app.require_claimed_account()` raises SQLSTATE `42501` with the stable message `claimed_account_required` otherwise.
- Missing or malformed identity context fails closed.

## Usage in RPCs

Call the guard at the start of every user-facing protected RPC, before reading caller-supplied organization, event, order, payout or device identifiers:

```sql
perform app.require_claimed_account();
```

This guard supplements, rather than replaces, normal ownership and role checks. A claimed account must still prove the required organization, event or platform capability.

## Usage in RLS

For protected table mutations, use the boolean helper in restrictive policies:

```sql
using (app.is_claimed_account() and <existing authorization predicate>)
with check (app.is_claimed_account() and <existing authorization predicate>)
```

Do not add the guard to guest checkout capabilities such as browsing, inventory reads, ticket holds, guest order creation or payment completion.

## Protected RPC batches

The first protected-RPC migration covers organization/event administration, finance and transfers:

- organization creation and deletion
- event draft creation, duplication and status transitions
- event artist management
- organizer and event KPI reads
- organization finance summaries and payout requests
- transfer request and completion

The second operational migration covers:

- membership invite creation, acceptance and revocation
- complimentary-ticket and guest-list issuance
- POS charging
- bulk and individual ticket scanning
- permanent-account profile updates
- talent-profile creation
- payment-method deactivation/default selection
- resale listing publication

Each protected RPC preserves its existing implementation under an `*_unchecked` name. `PUBLIC`, `anon` and `authenticated` execution is revoked from the unchecked implementation, and the original name is recreated as a fixed-search-path wrapper that runs `app.require_claimed_account()` first.

## Explicit exclusions

The following remain available to guest identities where product behavior requires it:

- public event discovery and inventory reads
- ticket holds and ordinary checkout
- order creation and provider payment completion
- ticket capability-token delivery
- resale and waitlist buyer checkout/payment completion
- guest-order discovery and claim flows

## Remaining rollout inventory

1. Refund initiation and approval paths.
2. Payout-account creation/update and payout processing/approval.
3. Device/session provisioning mutations not already routed through guarded scanner RPCs.
4. Platform-admin operations reachable by authenticated sessions.
5. Direct RLS/table mutation review for protected tables.
6. Claimed buyer, organizer, staff, admin and cross-organization persona regression tests.

For every surface, tests must prove:

- Anonymous session denied with `claimed_account_required`.
- Claimed buyer denied when lacking the relevant role.
- Authorized claimed organizer/staff/admin allowed.
- A user in Organization A cannot read or mutate Organization B.
- Guest checkout and later account claim still work.

## Verification

Run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account-protected-rpcs.sql
```

The migrations have also been executed transactionally against the current Ticketiv Supabase schema and rolled back after anonymous-denial and direct-bypass checks passed.