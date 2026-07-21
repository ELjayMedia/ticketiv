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

## Protected RPC batches

The first protected-RPC migration covers:

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

The final migration covers:

- buyer-owned refund initiation and controlled refund transitions
- payout-account and payout RLS hardening
- platform-admin-only payout processing transitions
- device registration and device-session lifecycle RPCs
- claimed-account platform-admin checks
- restrictive RLS policies across sensitive mutation tables

Each protected RPC preserves its existing implementation under an `*_unchecked` name where applicable. `PUBLIC`, `anon` and `authenticated` execution is revoked from unchecked implementations, and the original name is recreated as a fixed-search-path wrapper that runs `app.require_claimed_account()` first.

## Usage in RLS

For protected table mutations, use restrictive policies so the claimed-account boundary composes with existing ownership and role policies:

```sql
create policy claimed_example_update
on public.example
as restrictive
for update
to authenticated
using (app.is_claimed_account())
with check (app.is_claimed_account());
```

The final hardening migration applies this pattern to refunds, refund items, payout accounts, payouts, devices, device sessions, platform administrators, organization membership, profiles and guest-list mutations.

## Refund and payout boundaries

A refund request now requires all of the following:

- a claimed account
- `initiated_by = auth.uid()`
- initial status `requested`
- no processor reference or processed timestamp
- ownership of the payment, or finance/admin authority over its organization

Refund processing is performed through `fn_transition_refund`. Payout rows are created through `fn_request_payout` and processed through `fn_transition_payout`; direct authenticated payout mutation is revoked.

## Explicit exclusions

The following remain available to guest identities where product behavior requires it:

- public event discovery and inventory reads
- ticket holds and ordinary checkout
- order creation and provider payment completion
- ticket capability-token delivery
- resale and waitlist buyer checkout/payment completion
- guest-order discovery and account-claim flows

## Required regression coverage

Every protected surface must prove:

- anonymous session denied with `claimed_account_required`
- claimed buyer denied when lacking the required operational role
- authorized claimed organizer, finance user, scanner or admin allowed
- a user in Organization A cannot read or mutate Organization B
- guest checkout and later account claim still work

## Verification

Run the generic boundary and protected-RPC checks:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account-protected-rpcs.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-claimed-account-operations.sql
```

Run the seeded persona and cross-organization suite using the fixture variables documented at the top of:

```bash
scripts/verify-claimed-account-personas.sql
```

The migrations were also executed transactionally against the current Ticketiv Supabase schema and rolled back after compilation, anonymous-denial and direct-bypass checks passed.
