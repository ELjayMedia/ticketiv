# Ticketiv security follow-ups — 7 November 2026

Applies to: **TICK-465 / TICK-466 / TICK-467**. Evidence: Supabase Ticketiv
project `radsfmlsjznqvcpogluo` read-only inspection, GitHub `main` after
merged PR #520, and the SQL/Edge-function definitions in the repository.

## Current evidence and containment

1. **TICK-465:** Deployed Supabase Edge versions 24 (`resale-payment-success`)
   and 20 (`waitlist-payment-success`) accepted absent `amountCents`, `currency`,
   and provider reference, defaulted absent status to `succeeded`, never called
   the provider for transaction verification and wrote `provider_ref` — a column
   that does **not** exist on either `payments` or `payment_attempts`. The schema
   instead has `payments.ext_payment_id` and `payment_attempts.ext_ref`.
   No currently inspected payment row had `payload.kind=resale_checkout` or
   `waitlist_checkout`; that is **not** proof the endpoint cannot be called.
   This branch replaces both functions with a shared HMAC + Paystack verify
   gate, bound attempt/reference/amount/currency checks, guarded update, and
   the service-only, idempotent `fn_complete_*_after_payment_webhook` RPC.
   It removes the attacker-controlled `returnUrl` redirect.

2. **TICK-467:** Public `fn_preview_promo_code` is a SECURITY DEFINER RPC
   callable directly as `anon`/`authenticated`, bypassing the API's limiter;
   `get_public_profile` omits privacy/block checks; `fn_match_friend_contacts`
   does not reject guest identities; Storage's `avatars` bucket has no server
   enforced MIME/size ceiling (even though its server action checks them).
   The additive migration and matching server change address these gaps.

3. **TICK-466:** Prior PR #520 ran 41 isolated cross-org authorization cases
   successfully. The **production migration ledger still differs from Git**;
   a green CI test does **not** mean the shared database is safe to migrate.

## Production migration-ledger reconciliation

Inspected on 2026-11-07: 23 migration IDs recorded in Supabase. There are
33 SQL files on `main`: 21 IDs matched; two production-only IDs, 12 repository
only IDs. (This branch adds a 34th SQL file.)

**Production-only (not present as filenames in Git):**

| Live version | Live name | Likely corresponding Git migration — confirm by object/DDL diff |
| --- | --- | --- |
| `20261102165952` | `admin_finance_access` | `20261102100000_admin_finance_access.sql` |
| `20261106035957` | `payout_provider_tracking` | `20261105200000_payout_provider_tracking.sql` |

Read-only live catalog probes found `is_org_finance_viewer` includes
`organizer_admin` and the payouts `provider_rail` column exists, consistent
with those two migration *effects*. This alone cannot prove byte-for-byte
equality or that every constraint/index is aligned.

**Present in Git but not recorded by Supabase:**

| Migration version | Scope |
| --- | --- |
| `20261102090000` | organizer staff/door role |
| `20261102100000` | admin finance access (probable duplicate live ID) |
| `20261102120000` | payout account management |
| `20261103100000` | remove sales statistics from public interfaces |
| `20261105100000` | private profile created on signup |
| `20261105200000` | provider payout tracking (probable duplicate live ID) |
| `20261106100000` | admin console phase 1 |
| `20261107100000` | admin console phase 2 |
| `20261108100000` | admin console phase 3 (future-dated) |
| `20261109100000` | Event Companion (future-dated) |
| `20261110100000` | Event Companion release 2 (future-dated) |
| `20261111100000` | Event Companion release 3 (future-dated) |

Some objects from these migrations already exist in production:
`fn_event_public_live_stats`, `payout_accounts`, `user_private_profiles`.
That **does not** imply their policy definitions, grants, dependent objects,
backfills or migration bodies are the same. Blindly applying all missing Git
migrations could fail on existing objects, overwrite live customizations, or
apply future product changes prematurely. Blindly running `migration repair`
could hide real drift. Both are prohibited pending reconciliation.

### Release sequence (explicit gate)

1. Freeze security-impacting production DDL and export a **read-only schema
   diff** (functions with ownership/search_path/grants, table constraints,
   RLS, storage policies, view definitions, and the migration ledger).
2. Match the two live-only migrations against Git by **object-level effects**,
   not timestamps. Reconcile each of the 12 repo-only migrations into
   equivalent-already-live, intentionally-deferred, or genuinely-missing;
   inspect their dependencies. Create an reviewed, tested repair plan.
3. Rehearse the exact migration chain, including this branch's
   `security_public_surface_hardening`, in an **isolated** Supabase database;
   test a public/blocked/guest account and `security_public_surface.sql`.
4. Run payment tests with provider sandbox: valid Paystack transaction, missing
   / mismatched ref, wrong amount/currency, signed-but-unpaid, unsigned,
   duplicate callback, two orders with same reference, and concurrent retries.
   Require the registered Paystack attempt `ext_ref` to exist: older `manual`
   checkout placeholders are **not** sufficient evidence of payment.
5. Provision `PAYSTACK_SECRET_KEY` in the **Edge** secrets plus distinct
   `RESALE_PAYMENT_WEBHOOK_SECRET` and `WAITLIST_PAYMENT_WEBHOOK_SECRET`; verify
   callback emitter uses the exact HMAC-SHA256 request contract. If not, do
   not activate the new handlers. Keep `verify_jwt=false` only because HMAC
   and the independent Paystack lookup are enforced internally.
6. Deploy the two Edge functions in a controlled window, preserve rollback
   copies of v24/v20 and confirm metrics and audit evidence; then apply the
   reviewed production migration and regenerate `rpc-grants.json` **after**
   the shared database matches it. GitHub's `check:permissions` currently
   reads the live ledger and will fail if the snapshot is changed *before*
   production. Do not merge a false snapshot update just to turn CI green.
7. Human sign-off for provider secrets (including rotation), recovery path,
   payment/settlement owner, post-deploy negative tests, and final Jira closure.

### Threat model / operational owners

| Threat | Control | Evidence still required |
| --- | --- | --- |
| Forged/replayed payments issue or transfer tickets | Signed callback **and** provider GET verification, pre-bound `ext_ref`, exact amount/currency; conditional payment update + idempotent RPC | Provider sandbox E2E + Edge configuration |
| Cross-org/guest access to private data | SEC DEFINER grant lockdown, privacy delegation, claimed-account check, RLS/cross-org suite | Anonymous/blocked-account integration in isolated DB |
| Direct Storage upload bypasses UI checks | 5 MiB / approved MIME types configured on `avatars` bucket | Negative Storage upload in non-prod |
| Production migration history hides effective DDL | Read-only catalog diff and reviewed migration reconciliation | DBA/engineering approval and rehearsal |
| Leaked old HMAC/Paystack secrets | Human-controlled rotation/revocation | Security owner confirmation |

**Decision:** source changes are ready for review after tests, but **no shared
Supabase production migration or Edge deployment is authorized by this report**.
TICK-466 cannot be closed until recorded migration equality, secret-rotation
approval and production acceptance are evidenced. TICK-465/467 need controlled
production verification before Done.
