# Ticketiv production incident response

**Status:** launch runbook; human exercise still required  
**Owner model:** one Incident Lead, one Technical Operator, one Support/Comms Owner, plus an Organizer/Event representative when customer entry or sales are affected.

Use this runbook for platform incidents outside the narrower live-event payment/scanner playbook in `docs/LIVE_EVENT_ESCALATION.md`. The purpose is to make every response follow the same five phases: **detect, contain, communicate, recover, verify**.

Do not paste secrets, payout/bank details, full webhook payloads, ticket capability tokens, access tokens, or customer PII into the incident room or Jira. Record identifiers and aggregate evidence only.

## 1. Severity and ownership

| Severity | Typical impact | Initial target |
|---|---|---|
| **SEV1** | Production unavailable, paid buyers blocked from tickets/entry, money state uncertain, compromised privileged secret, or payout integrity at risk | Incident Lead immediately; containment starts now |
| **SEV2** | One critical capability materially degraded with a working fallback | Owner assigned within 10 minutes |
| **SEV3** | Limited/single-user issue with no evidence of systemic impact | Normal support/engineering queue |

For SEV1/SEV2, open a single incident record with: start time, incident lead, current severity, affected surfaces, current customer impact, next decision time, and links to non-sensitive evidence.

If a named human has not yet been assigned for launch, record that as a readiness blocker rather than inventing a name.

## 2. Universal first ten minutes

1. **Confirm the signal.** Check the relevant health endpoint, Vercel/Supabase runtime evidence, Sentry, finance reconciliation, scanner state or provider dashboard. Avoid making a destructive change merely to prove the incident is real.
2. **Name the Incident Lead.** One person owns decisions and the timeline; troubleshooting can be delegated.
3. **Freeze risky changes.** Pause unrelated deployments/migrations and avoid manual database edits while scope is uncertain.
4. **Classify customer impact.** Sales, ticket delivery, entry, refunds, payouts, organizer admin, or data access.
5. **Choose containment.** Pause a rail, roll back code, stop a payout, switch to a documented fallback, or revoke a compromised credential.
6. **Set the next update time.** For SEV1, no longer than 15 minutes while impact continues.
7. **Preserve evidence.** Deployment SHA, timestamps, request IDs, aggregate counts and provider references. Do not copy confidential payloads.

## 3. Payment-provider outage

See also `docs/LIVE_EVENT_ESCALATION.md`, `docs/PAYMENTS.md`, `docs/OPERATIONS.md` and the money-path verifier.

### Detect

- Checkout failures or provider initialization/verification errors rise together.
- Payment success-rate alert fires with a meaningful sample.
- Provider dashboard/status indicates degradation.
- Webhooks are arriving but provider calls fail, or provider calls succeed but callbacks stop.

### Contain

- If another configured rail is healthy for the event, keep that rail available and disable/pause only the failing rail.
- If all online rails are unhealthy, pause paid sales rather than accepting ambiguous money state.
- Never manually insert a succeeded payment, paid order, ledger row or ticket to “unstick” a buyer.

### Communicate

Tell buyers only what is known: which payment method is degraded, whether sales are paused, and what to do if money left their account but no ticket arrived. Do not promise refunds or ticket issuance until reconciliation confirms the state.

### Recover

- Restore provider connectivity/configuration.
- Reprocess only stored, previously verified webhook events using the documented replay path.
- Resolve order/payment discrepancies through the reconciliation queue; hold payout while critical money discrepancies remain.

### Verify

- Safe test-mode checkout succeeds where appropriate.
- Webhook lag returns to zero.
- Money reconciliation counts are clean or every remaining issue is explicitly owned.
- No duplicate succeeded payment/ticket issuance occurred during recovery.

## 4. Webhook backlog or callback outage

### Detect

- `webhook-processing-lag` alert fires.
- Unprocessed rows exceed the lag threshold.
- Buyers/providers report successful payment while orders remain pending.

### Contain

- If backlog is growing and payment state cannot be trusted, pause the affected payment rail before accepting more ambiguity.
- Do not delete pending webhook records and do not replay arbitrary caller-supplied JSON.

### Recover

1. Fix the underlying completion error first.
2. Replay eligible stored inbound events through the trusted replay action.
3. Process oldest verified events first when order is not otherwise material.
4. Leave failures pending with audit evidence for the next attempt.

### Verify

- Backlog older than threshold is zero.
- Reconciliation detects no succeeded-payment/paid-order mismatch.
- A redelivered/replayed event is idempotent.

## 5. Vercel/application outage or bad deployment

### Detect

- `/api/health` or the hardened production smoke fails.
- The independent uptime watchdog reports the deployment unreachable/non-2xx once TICK-262 is fully activated.
- Vercel runtime error rate/availability degrades immediately after a deployment.

### Contain

- Stop promotion and freeze new deploys.
- If the failure correlates with a new deployment and the last deployment was healthy, roll back application code before attempting database changes.
- Do not “fix forward” with an unrelated production migration unless the failure is proven database-side.

### Recover

Follow `docs/MIGRATION_ROLLBACK.md` when schema is involved. Prefer in this order:

1. code rollback to last known-good deployment;
2. forward fix compatible with both old/new schema;
3. corrective migration;
4. database restore only when integrity/data-loss requires it.

### Verify

- Run `scripts/smoke-deployment.sh https://ticketiv.app`.
- Confirm `/api/health`, `/api/health/supabase`, login and configured read-only fixtures pass.
- Inspect recent production errors for new clusters before reopening promotion.

## 6. Supabase/database outage or integrity event

### Detect

- `/api/health/supabase` fails or reports unreachable.
- Database/provider incident is confirmed.
- Reconciliation or core RPCs fail across unrelated flows.

### Contain

- Stop migrations and money-moving/admin operations.
- If reads are available but writes are unsafe, prefer a controlled degraded mode over repeated retries that can amplify load.
- Hold payouts when ledger/order/payment integrity cannot be verified.

### Recover

- For transient provider outage: wait for database health and avoid schema changes during instability.
- For application/schema fault: use `docs/MIGRATION_ROLLBACK.md`.
- For data loss/corruption: follow the restore procedure in `docs/OPERATIONS.md`; do not declare recovery from database restore alone because Storage, Vault secrets and external credentials are separate dependencies.

### Verify

After any restore or data-integrity recovery, require:

- RLS/permission verification;
- money reconciliation clean;
- provider settlement comparison intact where data exists;
- auth, order, ticket and audit-history spot checks;
- storage assets and required Vault/cron configuration restored;
- production smoke green.

## 7. Scanner/check-in outage

The detailed event-day decision tree is in `docs/LIVE_EVENT_ESCALATION.md`.

### Detect

Separate device failure, event assignment/auth failure, venue network failure, stale/offline manifest, scanner API failure, and duplicate/invalid-ticket behavior before choosing a fallback.

### Contain

- Move a single failed lane to a spare assigned device.
- If network fails and the approved offline path has a fresh manifest, stay offline and preserve local state until sync.
- If all automated validation is unavailable, manual admission requires Incident Lead/Event Supervisor approval and an audit list of every override.

### Verify

- A valid ticket checks in once.
- A repeat scan is rejected/identified as already used.
- Offline backlog syncs without losing check-ins.
- Attendee ticket state reflects successful check-in.

## 8. Compromised secret or privileged credential

Use `docs/SECRET_ROTATION.md` for the concrete rotation procedure.

### Detect

Treat a credential as compromised when it is committed, logged, pasted into an unintended channel, exposed through a client bundle, or accessed by a compromised account.

### Contain

- Stop the dependent privileged operation if continuing could move money or expose data.
- Revoke/replace the credential as soon as a safe replacement path exists.
- For encryption keys, preserve decryption ability; never blindly replace the only key to persistent ciphertext.

### Communicate

Limit the incident record to secret **name/class**, affected systems, exposure window, actions taken and audit evidence. Never paste the secret value into the record.

### Recover and verify

- Install replacement in every required secret store.
- Redeploy/restart dependent runtimes.
- Run the narrow safe smoke in `docs/SECRET_ROTATION.md`.
- Revoke the old credential after the replacement is proven.
- Review audit/provider logs for misuse and rotate downstream secrets if the compromised system could read them.

## 9. Payout/refund incident

### Detect

- Payout integrity alert, reconciliation issue, failed/duplicate payout attempt, refund state inconsistent with order/payment/ledger, or organizer reports wrong amount/account.

### Contain

- **Hold payout immediately** for the affected organizer/account when correctness is uncertain.
- Do not retry a transfer/refund until the provider's existing transaction state is known.
- Do not expose payout account details in incident evidence.

### Recover

- Reconcile internal order/payment/refund/payout/ledger state with provider records.
- For refunds, use the explicit approval/rejection/refund workflow and confirm provider outcome before repeating.
- For payouts, repair the discrepancy before re-authorizing movement of funds.
- If payout-account encryption/storage safety is implicated, follow TICK-376/security controls and pause affected payout-detail writes.

### Verify

- Organizer available/settled balances reconcile.
- No duplicate movement occurred.
- Refund/payout status matches provider fact.
- Audit log contains the operator decision and resulting action without sensitive bank data.

## 10. Communications discipline

For customer-facing incidents:

- say what is affected, what still works, and when the next update will be;
- avoid root-cause speculation before confirmation;
- never promise reimbursement, entry or ticket issuance before the authorized path confirms it;
- close with a recovery message only after verification, not merely after a deploy succeeds.

For internal updates, use this format:

```text
[SEV] Ticketiv incident — <short title>
Start:
Incident Lead:
Customer impact:
Current scope:
Containment in place:
Latest evidence:
Next action:
Next update at:
```

## 11. Closure criteria

An incident is not closed until:

1. customer impact has stopped;
2. the affected flow is verified, not merely redeployed;
3. money/data integrity checks are clean or remaining exceptions are owned;
4. temporary fallbacks/manual overrides are reconciled;
5. secrets/test data used during recovery are cleaned up;
6. the timeline and root cause are recorded at an appropriate level without sensitive data;
7. every follow-up has an owner/Jira issue and severity/priority.

## 12. Related runbooks

- `docs/LIVE_EVENT_ESCALATION.md` — event-day payment/scanner response.
- `docs/OPERATIONS.md` — reconciliation, alerting, backup/restore and operational controls.
- `docs/MIGRATION_ROLLBACK.md` — shared-environment migration recovery.
- `docs/SECRET_ROTATION.md` — routine and emergency credential rotation.
- `docs/SECURITY_SIGNOFF.md` — launch security blockers and abuse-test evidence.
- `docs/UPTIME_ALERTING.md` — independent application uptime monitoring rollout and test.
