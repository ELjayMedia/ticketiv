# Secret inventory and rotation runbook (TICK-261)

**Status:** pre-launch procedure — drill pending  
**Last reviewed:** 2026-08-11

This runbook defines how Ticketiv inventories and rotates production secrets without copying secret values into source control, Jira, screenshots, chat transcripts or application logs.

The shared-environment decision in `docs/adr/0002-shared-supabase-environment.md` makes secret changes production changes: previews and UAT use the same Supabase/Vercel boundary. Rotate deliberately and avoid active sales/event windows.

## 1. Non-negotiable rules

1. Never paste a secret value into GitHub, Jira, documentation, screenshots or chat.
2. Record **secret name, owner, storage location, rotation date and validation evidence**, never the value.
3. Create/activate a replacement before revoking the old credential whenever the provider supports overlap.
4. Deploy and smoke-test the replacement before destroying rollback access.
5. For credentials that encrypt persistent data, prove backward decryption or complete re-encryption **before** rotating.
6. Treat failed rotation as an incident: stop dependent writes, restore the last known-working credential if safe, and investigate before retrying.
7. Re-run `pnpm check:permissions` / relevant smoke tests after any privileged Supabase credential change.

## 2. Inventory

The repository's `.env.example` is the naming baseline. An operator must verify actual production presence/access in the deployment/provider consoles; this review does not claim visibility into stored secret values.

| Secret / credential | Primary use | Expected storage | Rotation note | Production presence |
|---|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side RLS-bypass/admin calls | Vercel server env | High privilege; redeploy and verify server-only import guard | **PENDING operator check** |
| `PAYOUT_ENCRYPTION_KEY` | Encrypt payout banking details | Vercel server env | **BLOCKED by TICK-376**; do not rotate blindly | **PENDING operator check** |
| `TICKET_TOKEN_SECRET` | HMAC ticket/order capability links | Vercel server env | Current single-key design invalidates unexpired links on rotation | **PENDING operator check** |
| `PAYSTACK_SECRET_KEY` | Payment initialization/verification/refund | Server/provider config | Keep test/live mode gates intact; rotate outside transaction window | **PENDING operator check** |
| `CRON_SECRET` | Protect cron/ops endpoints | Vercel + Supabase Vault copy | Both copies must stay synchronized | **PENDING operator check** |
| `RESEND_API_KEY` | Email delivery | Vercel/server provider config | Validate a non-sensitive test message before revoking old key | **PENDING operator check** |
| WhatsApp provider credentials | WhatsApp delivery | Vercel/server provider config | Validate provider auth + test delivery | **PENDING operator check** |
| `SMS_API_KEY` / SMS provider credentials | SMS delivery | Vercel/server provider config | Validate provider auth + test delivery | **PENDING operator check** |
| MoMo collection credentials | MoMo API access | Vercel/server provider config | Do not activate production rail solely as part of a rotation | **PENDING operator check** |
| `UPSTASH_REDIS_REST_TOKEN` | Rate-limit/cache backend | Vercel server env | Test rate-limiter/cache before revoking old token | **PENDING operator check** |
| `VAPID_PRIVATE_KEY` | Web push signing | Vercel server env | Rotation can affect existing subscriptions depending on public-key change | **PENDING operator check** |
| `SENTRY_AUTH_TOKEN` | Build/release upload | CI/Vercel build secret | Validate release upload; not a browser runtime secret | **PENDING operator check** |
| `SUPABASE_ACCESS_TOKEN` | CLI/CI management access | CI/operator secret store | Rotate independently of application runtime keys | **PENDING operator check** |
| `VERCEL_TOKEN` | Deployment/automation access | CI/operator secret store | Validate scoped deployment access before revocation | **PENDING operator check** |
| `OPS_ALERT_WEBHOOK_URL` | Operational alerts | Server/Supabase secret store | Treat the full URL as a credential | **PENDING operator check** |

Post-launch/parked features should not force launch-time secret work merely because their placeholders exist in `.env.example`.

## 3. Standard rotation sequence

For a credential that does not encrypt persistent data:

1. **Choose a quiet window.** Avoid live event entry, active ticket on-sale spikes, settlement/refund work, or an incident already in progress.
2. **Capture baseline.** Record current deployment SHA, relevant health/smoke status, and dependent provider/service.
3. **Create replacement.** Generate a new credential in the provider/operator console. Do not expose it in tickets/docs.
4. **Install replacement.** Update the authoritative secret store(s). If the credential is duplicated across systems, update all required copies before the validation step.
5. **Redeploy/restart if required.** Ensure new runtime instances actually read the replacement.
6. **Validate.** Run the narrowest safe smoke test that proves the dependent path.
7. **Observe.** Check error monitoring and relevant operational counters for a short controlled window.
8. **Revoke old credential.** Only after the new credential is proven.
9. **Validate again.** Confirm the path still works after old-key revocation.
10. **Record evidence.** Secret name, date/time, operator, deployment SHA, validation performed, old-key revocation confirmed. Never record secret material.

If the provider does not support overlapping credentials, document the expected interruption and rollback path before beginning.

## 4. Special case — payout encryption key

**Current state: do not rotate. TICK-376 is a launch blocker.**

`lib/payout-crypto.ts` currently supports an `enc:v1:` AES-256-GCM envelope derived from one `PAYOUT_ENCRYPTION_KEY`, but also falls back to plaintext when the key is absent. A live 2026-08-11 format-only audit found one payout-account row and zero `enc:v1:` rows.

A safe design must land before rotation:

- production writes fail closed if the active encryption key is missing;
- ciphertext identifies a key version/key ID or an equivalent keyring mechanism;
- the application can decrypt ciphertext produced by the previous key during migration;
- existing legacy/plaintext rows are re-encrypted through a server/operator path that never logs or returns banking details;
- tests cover active-key encrypt/decrypt, previous-key decrypt, malformed ciphertext and legacy migration;
- live verification ends with zero legacy/plaintext payout rows.

### Required rotation drill after TICK-376

Use synthetic/non-production banking data only:

1. Encrypt a test payout record with key version A.
2. Configure A as previous and B as active.
3. Prove the A record still decrypts and new writes use B.
4. Re-encrypt the A record to B.
5. Prove no A ciphertext remains in the drill dataset.
6. Remove A and prove B records still decrypt.
7. Record only the key IDs/versions and test evidence, never key values.

Only after this passes should the production payout key be considered rotatable.

## 5. Special case — ticket/order capability secret

`lib/ticket-tokens.ts` currently signs and verifies with one `TICKET_TOKEN_SECRET`. Rotating it immediately invalidates still-unexpired `/t` and `/o` capability links issued under the old secret.

Before routine rotation, choose one of these explicit strategies:

- **Short planned invalidation:** accept that outstanding links will fail, coordinate support/comms and reissue links after rotation; or
- **Overlap support:** add a current + previous verification key/key ID so old links remain valid until their normal expiry, while all new tokens use the new key.

The overlap strategy is preferred if Ticketiv has active paid tickets with delivered capability links.

Validation after rotation must include one newly issued ticket link and one intended legacy-link case according to the chosen strategy. Token capability remains view-only; rotation must not widen it into mutation authorization.

## 6. Special case — `CRON_SECRET`

`.env.example` documents that this credential is also copied to Supabase Vault as `ops_alert_cron_secret`. Treat these as two replicas of one logical credential.

Rotation order:

1. Prepare the replacement without recording its value.
2. Update the application/runtime side and the Supabase Vault copy in one controlled change window.
3. Invoke the protected cron/ops path and confirm authorized execution succeeds.
4. Confirm a request using the retired credential no longer authorizes after cutover, if a safe test mechanism exists.
5. Record synchronization and smoke-test evidence.

Do not leave one system on the old value: that creates an outage that looks like an authentication failure rather than an expired credential.

## 7. Special case — Supabase service role

The service-role credential bypasses RLS and is one of Ticketiv's highest-privilege secrets.

A rotation must:

- update only server/CI secret stores, never browser-exposed `NEXT_PUBLIC_*` variables;
- redeploy all server paths that cache/read the credential at process start;
- run a server-side health path plus `pnpm check:permissions`/live RPC drift validation;
- verify the service-role/client-bundle guard still passes;
- check Sentry/logs for authorization failures before revoking the retired credential;
- record the deployment SHA and validation, not the credential.

If the platform changes its Supabase key model, follow the provider's then-current official rotation procedure rather than guessing from this runbook.

## 8. Special case — Paystack secret

Keep Ticketiv's existing live-mode guard intact: possession of a live secret must not by itself make preview/UAT traffic capable of taking live money.

Rotate outside an active payment window. After installing the replacement, validate only the intended environment/mode:

- payment initialization/verification authentication;
- a safe test-mode checkout when still pre-launch;
- webhook handling remains signature-verified and idempotent;
- refund/provider operations authenticate if they are in the launch candidate.

Do not use secret rotation as the mechanism for switching Ticketiv to live Paystack. Live activation remains its own controlled gate.

## 9. Notification, monitoring and infrastructure credentials

For Resend, WhatsApp, SMS, Redis, Sentry and deployment/CI tokens, use the standard rotation sequence and the narrowest safe validation:

- notification keys: send to an approved test recipient and ensure no bulk queue is triggered;
- Redis: exercise the rate-limit/cache path and inspect errors;
- Sentry: confirm a build/release artifact can be uploaded without changing runtime DSN behaviour;
- deployment/management tokens: prove the intended scoped management action, then revoke the old token.

Prefer scoped credentials and least privilege wherever the provider supports it.

## 10. Emergency rotation

Trigger immediate rotation when a credential is suspected exposed, committed, printed in logs/screenshots, sent to an unintended recipient, or accessed by a compromised account.

Priority order is based on blast radius, not convenience:

1. Credentials capable of moving money or bypassing authorization.
2. Encryption/signing secrets where compromise enables data disclosure or forged capabilities.
3. Database/service-role and deployment-management credentials.
4. Notification and operational integrations.

During emergency rotation:

- contain/revoke the exposed credential as soon as a safe replacement path exists;
- pause dependent writes if key continuity cannot be guaranteed;
- search version control/build logs/provider logs for exposure without copying the secret into the incident ticket;
- review access/audit records for misuse;
- rotate downstream credentials if the compromised system could read them;
- document the incident timeline and evidence, never the secret itself.

For `PAYOUT_ENCRYPTION_KEY`, emergency response must preserve decryption ability. If compromise occurs before TICK-376 keyring support lands, pause payout-detail writes and treat remediation as a security incident rather than replacing the key blindly.

## 11. Rotation drill evidence template

Run this before security sign-off and after material changes to the secret architecture.

| Field | Evidence |
|---|---|
| Date/time | **PENDING** |
| Operator/reviewer | **PENDING** |
| Launch/test commit SHA | **PENDING** |
| Secret class exercised | **PENDING** |
| Synthetic/non-production data used | **PENDING** |
| Replacement installed | **PENDING** |
| New credential validated | **PENDING** |
| Old credential revoked/retired | **PENDING** |
| Post-revocation smoke passed | **PENDING** |
| Rollback tested/documented | **PENDING** |
| No secret value captured in evidence | **PENDING** |
| Payout key-version drill (after TICK-376) | **PENDING** |

The completed drill and the frozen launch-candidate evidence are prerequisites for changing `docs/SECURITY_SIGNOFF.md` from **NOT APPROVED** to approved.
