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

## Rollout inventory

Apply and verify the guard across these protected surfaces:

1. Organization creation, updates, membership and deletion.
2. Event creation, editing, publishing and deletion.
3. Profile changes that establish public or operational identity.
4. Ticket transfer and refund requests.
5. Finance reports, payout accounts, payout requests and approvals.
6. POS, cashier, scanner and device management.
7. Complimentary ticket and guest-list administration.
8. Resale and waitlist seller/organizer controls.
9. Platform-admin operations.

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
```

The harness verifies anonymous denial, permanent-account allowance and fail-closed behavior when the JWT claim is absent.
