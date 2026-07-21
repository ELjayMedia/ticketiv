# Claimed-account authorization boundary

Ticketiv supports guest checkout by creating anonymous Supabase Auth users. Those users receive the same `authenticated` Postgres role as permanent accounts, so `auth.uid()` and `to authenticated` do not distinguish a recoverable account from a guest session.

The migration `20260721163000_claimed_account_guard.sql` introduces the canonical boundary:

- `app.is_claimed_account()` returns true only when a user exists and the trusted JWT `is_anonymous` claim is explicitly false.
- `app.require_claimed_account()` raises SQLSTATE `42501` with the stable message `claimed_account_required` otherwise.
- Missing or malformed identity context fails closed.

The migration `20260721190000_protect_claimed_account_rpcs.sql` applies that boundary to the first high-risk user-facing RPC batch.

## Usage in RPCs

Call the guard at the start of every user-facing protected RPC, before reading caller-supplied organization, event, order, payout or device identifiers:

```sql
perform app.require_claimed_account();
```

This guard supplements, rather than replaces, normal ownership and role checks. A claimed account must still prove the required organization, event or platform capability.

For legacy functions whose bodies should remain unchanged, the rollout uses a guarded-wrapper pattern:

1. Rename the original implementation to `*_unchecked`.
2. Revoke `PUBLIC`, `anon` and `authenticated` execution on the unchecked implementation.
3. Expose a fixed-search-path `SECURITY DEFINER` wrapper under the original RPC name.
4. Run `app.require_claimed_account()` before forwarding the original arguments.

This keeps the existing application contract stable while preventing direct bypass of the guard.

## First protected RPC batch

The following direct user-facing operations now have guarded wrappers:

- `fn_create_organization`
- `create_event_draft`
- `fn_delete_organization`
- `fn_duplicate_event`
- `fn_transition_event_status`
- `fn_link_event_artist_by_name`
- `fn_org_finance_summary`
- `fn_request_payout`
- `fn_request_transfer_by_email`
- `fn_complete_transfer`
- `get_organizer_kpis`
- `get_event_kpis`

The unchecked implementations are service-role-only and cannot be executed directly by `authenticated`.

## Usage in RLS

For protected table mutations, use the boolean helper in restrictive policies:

```sql
using (app.is_claimed_account() and <existing authorization predicate>)
with check (app.is_claimed_account() and <existing authorization predicate>)
```

Do not add the guard to guest checkout capabilities such as browsing, inventory reads, ticket holds, guest order creation or payment completion.

## Remaining rollout inventory

Apply and verify the guard across these protected surfaces:

1. Organization profile updates and membership management.
2. Event editing, publishing APIs and deletion paths not covered by the first RPC batch.
3. Profile changes that establish public or operational identity.
4. Refund initiation and approval workflows.
5. Payout-account management and payout approval/processing surfaces.
6. POS, cashier, scanner and device management.
7. Complimentary ticket and guest-list administration.
8. Resale and waitlist seller/organizer controls.
9. Platform-admin operations.
10. Direct table mutations and RLS policies that still depend only on `authenticated` or `auth.uid()`.

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

The first harness verifies the canonical identity boundary. The second verifies anonymous denial across the first protected RPC batch and confirms `authenticated` cannot call the unchecked implementations directly.
