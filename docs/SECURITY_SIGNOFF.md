# Pre-launch security review and sign-off (TICK-261)

**Review date:** 2026-08-11  
**Status:** **NOT SIGNED OFF — launch blocker open**  
**System:** Ticketiv web/native clients → Vercel/Next.js → Supabase `radsfmlsjznqvcpogluo` → payment/notification providers

This is the formal pre-launch security review record. A feature being marked Done is not, by itself, security sign-off. Final approval must be tied to a frozen launch-candidate Git commit, the applied Supabase migration set, the abuse-test evidence, and a completed secret-rotation drill.

## 1. Current decision

**Do not sign off launch yet.** The 2026-08-11 review found a P0 payout-secret issue tracked by **TICK-376**:

- `public.payout_accounts` contains one populated row;
- zero rows use the application's `enc:v1:` AES-GCM envelope;
- one populated row is therefore still in the legacy/non-encrypted envelope format.

No banking-detail value was selected or exposed during this check; only the storage-format prefix was counted.

The same review found that `lib/payout-crypto.ts` currently falls back to plaintext JSON when `PAYOUT_ENCRYPTION_KEY` is missing and only supports one current key. Rotating that key blindly would make existing `enc:v1:` ciphertext unreadable. TICK-376 must therefore land before payout/withdrawal security sign-off.

Other closeout items:

- TICK-337 permission-drift follow-up PR #393 must merge and pass CI.
- Freeze and record the final launch-candidate commit and migration version.
- Verify the production secret inventory without copying secret values into GitHub, Jira, logs or this document.
- Execute the rotation drill in `docs/SECRET_ROTATION.md` and record evidence.
- Re-run the critical abuse cases against the frozen launch candidate.

## 2. Assets and security objectives

| Asset | Objective |
|---|---|
| Orders, payments, refunds, payouts and ledger | Integrity first: no forged, duplicated, cross-org or replayed money movement |
| Ticket ownership and QR/check-in state | One valid owner/admission state; replay cannot create a second admission |
| Buyer/organizer PII | Confidentiality and least-privilege access |
| Payout destination details | Encryption at rest; server-only decrypt; safe key rotation |
| Provider/API credentials | Server-only storage; least privilege; safely revocable |
| Organization/event administration | Strong tenant isolation and role checks on privileged mutations |
| Guest ticket/order capability links | View-only, scoped, signed and expiring |
| Audit trail | Privileged finance/admin changes remain attributable and auditable |

## 3. Trust boundaries

1. **Browser/native client.** IDs, request bodies, cached roles and deep-link state are user-controlled and cannot be authorization evidence.
2. **Anonymous Supabase session.** Ticketiv intentionally supports guest checkout. An anonymous user carries the `authenticated` database role, so `TO authenticated` alone is not a claimed-account boundary. See `docs/CLAIMED_ACCOUNT_GUARD.md`.
3. **Claimed authenticated account.** Identity is stronger, but org/event access still needs current RLS/RPC authorization.
4. **Next.js server/service role.** `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It must remain server-only; the repository has a client-bundle/service-role guard from TICK-261.
5. **Supabase database.** RLS, function grants, pinned `search_path`, constraints, idempotency and ledger rules are the final data boundary.
6. **External providers.** Paystack and notification providers are untrusted network peers; inbound payment events require verification and replay protection.
7. **Scanner device/session.** Scanner state may be stolen, stale or offline; event scope and session validity must be revalidated server-side.

Ticketiv intentionally uses one Supabase project and one Vercel project for development, UAT and production. That accepted cost decision and its compensating controls are recorded in `docs/adr/0002-shared-supabase-environment.md`.

## 4. Threat model by launch flow

Status meanings:

- **Verified** — evidence exists and is named below.
- **Partially verified** — core controls exist, but the abuse case must be rerun on the frozen launch candidate.
- **Blocked** — an open finding prevents sign-off.

| Flow | Primary threats | Existing control/evidence | Status |
|---|---|---|---|
| Checkout / order creation | amount tampering, foreign order IDs, duplicate requests, anonymous abuse | Database-side money calculation, explicit guest/claimed-account boundary, rate limiting, prior cross-org harness | Partially verified |
| Paystack webhook / payment completion | forged webhook, replay, amount mismatch, duplicate settlement | Signature verification, provider-event dedupe, unique payment reference and amount checks documented in `docs/RUNBOOK.md` | Partially verified — TICK-335/TICK-66 still gate real-money sign-off |
| Refund | unauthorized approval/rejection, over-refund, provider replay, ledger mismatch | Separate refund state, provider integration and ledger effects; TICK-352 owns completion | Partially verified |
| Payout / withdrawal | cross-org payout, forged destination, plaintext bank details, unsafe key rotation, duplicate payout | Org/RPC authorization and payout ledger/state controls exist | **Blocked — TICK-376** |
| Scanner / check-in | forged ticket/event/device IDs, QR replay, duplicate/offline admission, stale session | `fn_scan_ticket`, device/session model and unique scan/admission controls | Partially verified |
| Event creation/status | foreign org/event ID, role escalation, unsafe transition | Privileged RPC surface reviewed under TICK-337; prior tenant-boundary tests | Partially verified |
| Organization deletion | delete foreign org, stale-owner session, dependency bypass | `fn_delete_organization` is privileged and previously blocked a non-member target | Partially verified |
| Staff invitation | foreign-org invite, privilege escalation, token replay/expiry | create/revoke/accept invite RPCs are in the reviewed privileged surface | Partially verified |
| Resale | sell/complete another user's ticket, replay completion, stale ownership | Provider-completion functions are explicitly never-client-callable under TICK-337 | Partially verified |
| Waitlist | claim another position, forged listing/order ID, duplicate completion | Provider-completion functions are never-client-callable; wrappers remain authorization-scoped | Partially verified |
| Guest ticket/order links | token theft/tamper, cross-resource use, mutation through capability | `lib/ticket-tokens.ts`: HMAC-SHA256, scope/kind, expiry, constant-time signature check, no PII/QR data, view-only contract | Verified design; rotation impact remains operational |

## 5. Authorization and RPC evidence

TICK-337 is the control for privileged database RPC drift. The repository keeps a version-controlled permission matrix and enforces that every `SECURITY DEFINER` function pins `search_path`. Particularly sensitive payment-completion/export functions are never allowed to be browser-callable. Anonymous SECURITY DEFINER functions require an explicit reviewed allowlist entry.

Prior live cross-org testing recorded under TICK-337 reached **41/41 checks passing** after harness fixes, including finance, event/admin and transactional boundaries. That evidence is useful but will be rerun for the launch candidate rather than treated as permanent proof.

On 2026-08-11, live inspection identified `public.get_public_profile(p_handle text)` as a new intentional anonymous RPC introduced after the original matrix. It is `STABLE`, read-only, validates handle format, pins an empty `search_path`, returns only public-profile fields and has no `PUBLIC` grant. PR #393 records it in the reviewed matrix/allowlist.

## 6. Supabase Security Advisor disposition — 2026-08-11

Advisor output is review input, not an automatic pass/fail.

### Anonymous SECURITY DEFINER warnings

The current anonymous surface is intentionally limited and reviewed under TICK-337:

- `fn_apply_pricing_to_order` — trigger helper; direct RPC execution is runtime-guarded with `pg_trigger_depth()` because the grant is needed by guest-trigger execution.
- `fn_preview_promo_code` — read-only public promo preview.
- `fn_ticket_type_remaining` — read-only public availability count.
- `get_public_profile` — read-only privacy-safe `/@username` lookup, now recorded by PR #393.

Any new anonymous SECURITY DEFINER function must fail the permission guard until explicitly reviewed.

### Authenticated SECURITY DEFINER warnings

These are expected for RPC wrappers that intentionally mediate authenticated mutations, but they are not blanket-waived. Grants, `search_path`, never-client-callable functions and live drift are governed by TICK-337; authorization behaviour is covered by tenant/abuse tests.

### Anonymous-access-policy warnings

Expected consequence of guest checkout. Disabling anonymous sign-ins would break the product model. The claimed-account guard is the boundary for operations that require a permanent account. See `docs/CLAIMED_ACCOUNT_GUARD.md` and `docs/SECURITY_ADVISOR_REMEDIATION.md`.

### RLS enabled with no policy

The advisor currently lists:

- `private.organizer_identity_details`
- `public.audit_log_archive`
- `public.disputes`
- `public.ops_cron_runs`
- `public.payment_outbox`
- `public.provider_settlement_items`
- `public.provider_settlements`
- `public.rate_limits`
- `public.scans_archive`

A live privilege check on 2026-08-11 confirmed every listed table has RLS enabled, zero policies, no SELECT/INSERT/UPDATE/DELETE privilege for `anon` or `authenticated`, and service-role read access. That is fail-closed for browser clients and is accepted as informational unless a future migration widens client privileges.

### Leaked-password protection

Still disabled. This remains an explicit, previously accepted non-blocking risk; it is not being represented as fixed.

## 7. Concrete finding: payout encryption

Live aggregate check on 2026-08-11:

| Check | Result |
|---|---:|
| `payout_accounts` total | 1 |
| `details_encrypted LIKE 'enc:v1:%'` | 0 |
| populated non-`enc:v1:` rows | 1 |

No bank account number, provider payload or plaintext detail was selected.

`lib/payout-crypto.ts` currently:

- encrypts with AES-256-GCM when `PAYOUT_ENCRYPTION_KEY` exists;
- stores legacy plaintext JSON when the key is absent;
- decrypts legacy plaintext for compatibility;
- decrypts `enc:v1:` only with the current single environment key.

**Disposition:** launch blocker, TICK-376. Do not rotate the current payout key blindly and do not seed/re-save payout details until production fails closed on a missing key and a safe rotation path exists.

## 8. Abuse-test checklist for the frozen launch candidate

Record the test/run/commit evidence instead of checking these from memory.

- [ ] **IDOR:** substitute another org/event/order/order-item/refund/payout/device ID in privileged routes/RPCs; deny without exposing protected row content.
- [ ] **Privilege escalation:** viewer/staff cannot perform owner/admin/finance mutations; anonymous sessions cannot perform claimed-account-only operations.
- [ ] **Forged identities:** client-provided user/scanner IDs cannot override authenticated/session identity.
- [ ] **Replay:** resend the same payment webhook/refund completion/scan/invite acceptance/resale completion/waitlist completion; effects occur at most once.
- [ ] **Concurrency:** simultaneous checkout/refund/payout/scan requests remain protected by database uniqueness/idempotency, not UI locking.
- [ ] **Stale session:** remove/downgrade org/event access during an active session/device; the next privileged mutation observes current authorization.
- [ ] **Compromised scanner:** event-A device/session cannot admit event-B tickets; ended/revoked sessions cannot continue writing scans.
- [ ] **Audit/logging:** privileged finance/admin actions leave the expected audit evidence without provider secrets or banking PII appearing in logs.

## 9. Final sign-off record

Fill only after the blocker list is empty.

| Field | Value |
|---|---|
| Launch-candidate Git commit | **PENDING** |
| Applied migration max/version | **PENDING** |
| `pnpm check:permissions` + live drift | **PENDING launch-candidate rerun** |
| Cross-org/abuse evidence | **PENDING** |
| Production secret inventory verified | **PENDING** |
| Secret-rotation drill | **PENDING** |
| Payout plaintext rows | **BLOCKED — TICK-376** |
| Critical/high findings open | **YES — TICK-376** |
| Security sign-off | **NOT APPROVED** |

When approved, record the date, reviewer/operator, exact commit SHA, migration version and evidence links. Never paste credential values into this file.
