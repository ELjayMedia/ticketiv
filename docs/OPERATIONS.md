# Ticketiv — Operational Controls

Operational readiness for handling real customer money. Each control is marked
**Built**, **Partial**, or **To do**, with the concrete procedure and the gap.
Money is integer cents; `SZL`; the ledger's settlement rows carry a `payment_id`
and satisfy `sum(order_gross) + sum(fee) = sum(payment_net)`.

---

## 1. Payment reconciliation — **Built**

**Built.** `fn_org_finance_summary(org)` is the single source of truth for org
money (gross/fees/net/available/settled). Per-event and payout reconciliation
live in `lib/reconciliation.ts`, `lib/data/admin/reconciliation.ts` and
`lib/data/admin/settlement.ts` (surfaced in the super-admin finance UI).
`scripts/ops-reconciliation.sql` is a read-only integrity suite covering
orders ↔ payments ↔ order_items ↔ ledger_entries ↔ refunds ↔ payouts
(succeeded-but-not-paid, missing/broken settlement ledger, unissued paid
tickets, duplicate payments, refund-without-ledger, payout over-draw,
dead-letter webhooks, paid-item-on-unpaid-order). It returns only offending
rows — empty = healthy. As of the last run, **all checks pass (0 anomalies)**.

**Procedure.** Run `scripts/ops-reconciliation.sql` (a) before every payout
batch, (b) daily, and (c) as a pre-real-money gate. Investigate any non-empty
result before releasing funds.

**Provider settlement reconciliation** (migration `20260730210000`) closes the
internal-only gap. Internal checks catch our own bugs; they cannot catch a
difference between what the provider actually settled and what we believe we
earned — a fee we did not model, a transaction reversed provider-side, or a
settlement that never arrived. Those are the differences that cost real money.

- **`provider_settlements`** (one row per settlement batch) and
  **`provider_settlement_items`** (the transactions inside it, matched to
  `payments` by `(provider, ext_payment_id)` — the same key the webhook writes).
  Both are provider-reported facts, kept deliberately **separate from our money
  tables** so the two can be compared rather than conflated. Service-role only.
- **`fn_upsert_provider_settlement(...)`** ingests idempotently (keyed on
  `(provider, ext_settlement_id)` and `(settlement_id, ext_payment_id)`), so
  retries and overlapping date windows update in place. An item that matches no
  payment is **recorded with a NULL `payment_id`, not rejected** — "the provider
  settled something we have no payment for" is precisely the anomaly worth
  alerting on.
- **`fn_provider_settlement_counts()`** returns the comparison as counts:
  unmatched items, per-transaction amount mismatch, batches where
  `gross - fees <> net`, succeeded payments never settled (7-day grace), and
  hours since the last ingest.
- **Ingestion:** `lib/payments/paystack-settlements.ts` →
  `app/api/cron/settlements` (`CRON_SECRET`-secured), scheduled **daily** by
  `.github/workflows/settlement-ingest.yml`. Daily rather than every 5 minutes
  because settlements land at most once a day and the Paystack settlement API is
  paginated and rate limited. A missed day self-heals via the multi-day lookback.
- **Alerting:** the ops-alerts cron surfaces this as `provider-settlement` —
  **critical** on any mismatch, **warning** when ingest is merely stale
  (`OPS_ALERT_SETTLEMENT_STALE_HOURS`, default 48), and **skipped** before the
  first ingest so it never implies the books reconcile when nothing has been
  compared yet.

Verified with a rolled-back test: a batch with one matching and one unknown
transaction reported 1 matched / 1 unmatched, re-ingesting produced no
duplicates, and the amount-mismatch, internal-imbalance and unmatched detectors
each fired on purpose-built rows.

**Gap (To do).** Payout-to-bank confirmation: we compare provider settlement
against our `payments`, but the final leg (settlement → organizer bank account)
still relies on `payouts.status`. Ingesting provider transfer/payout records
would close that last hop.

---

## 2. Webhook replay, idempotency & dead-letter — **Built**

**Built.** Idempotency is enforced two ways: `payments (provider,
ext_payment_id)` is unique (a redelivered success reuses the payment, no double
credit), and `webhooks (provider, provider_event_id)` de-dupes provider events;
`webhooks.processed_at` marks completion. Completion writes are idempotent
(ledger written once per payment, order flipped once). Signature verification is
HMAC-SHA512 (`verifyTrustedPaystackSignature`). Completion is **service-role
only** — a browser cannot finalize a payment (see the money-path work).

**Dead-letter detection.** Unprocessed rows (`processed_at IS NULL`) older than
the lag threshold are surfaced by the ops-alerts cron and by
`scripts/ops-reconciliation.sql` check #8.

**Replay tool.** The super-admin webhooks page (`/super-admin/webhooks` →
**Inbound** tab) shows a **Reprocess** button on every `PENDING` row, backed by
the `replayInboundWebhook` server action. Safety rests on three properties:

1. **The payload is never supplied by the caller.** The action takes only a row
   id and reads `webhooks.payload` — the body this system already HMAC-verified
   at receipt. There is deliberately no "replay arbitrary JSON" affordance, so an
   admin cannot inject or edit a payment event.
2. **It re-runs the same trusted path** as the live route
   (`completeTrustedPaystackWebhook`), so a replay cannot take a shortcut the
   normal delivery would not.
3. **Replay is idempotent by construction** — verified against production with a
   rolled-back double-completion: the second run returned
   `already_completed = true`, leaving **1** payment row (no double charge),
   ledger gross equal to the order total (not doubled), and the ticket issued
   once.

Only unprocessed rows are eligible (a processed row would be a no-op, so the
button refuses it rather than implying it did something). The action is gated to
non-`read_only_admin` tiers, writes an `audit_log` entry on both success and
failure, and on failure leaves `processed_at` NULL so the row stays in the
dead-letter list.

**Procedure.** Dead letters appear in the ops-alerts cron and
`scripts/ops-reconciliation.sql` #8. Investigate the underlying failure first
(the stored payload and Sentry breadcrumbs say why completion threw), fix the
cause, then hit **Reprocess**. If replay fails again the row stays pending and
the error is recorded in `audit_log`.

**Gap (To do).** Replay currently handles **Paystack** only — the sole provider
with a completion path. Other providers are rejected with a clear message; add a
handler alongside `completeTrustedPaystackWebhook` when a second provider ships.

---

## 3. Alerting — **Built (core conditions covered)**

> **Correction (2026-08-04).** This section previously read "Built" while the
> control had **never executed in production**. The GitHub Actions workflow that
> held the schedule required the repo secrets `OPS_ALERT_CRON_URL` and
> `CRON_SECRET`; neither was ever set, so every run since 2026-07-18 exited 1 at
> the first guard without calling the endpoint. GitHub also throttled the `*/5`
> schedule hard — 247 runs in 17 days, roughly one every 100 minutes rather than
> every 5. "The code exists" was being read as "the control runs"; treat a
> control as built only once you have seen a successful invocation.
> `.github/workflows/settlement-ingest.yml` reads the same unset `CRON_SECRET`
> and fails the same way.
>
> **Resolved 2026-08-07 17:34 UTC — first successful invocation on record.**
> `CRON_SECRET` was generated, set in Vercel, matched into Vault, and the project
> redeployed. The pg_cron job returned **HTTP 200, `ok: true`**, with all seven
> checks reporting (`health-url-checks`, `order-state-consistency`,
> `payout-integrity`, `stuck-async-work`, `webhook-processing-lag` all **ok**;
> `payment-success-rate` and `provider-settlement` **skipped** for want of data).
> `fn_rate_limit_gc()` pruned **28** expired rate-limit windows on that first
> pass — housekeeping that had never once run. pg_cron also honours the cadence
> exactly: ticks landed at :05, :10, :15, :20, :25, :30.

> ⚠️ **The delivery leg is still unproven.** A healthy system never calls
> `postOpsAlert`, so a green run says nothing about whether an alert would reach
> a human. If `OPS_ALERT_WEBHOOK_URL` is unset, `postOpsAlert` returns
> `{sent: false, skipped: true}` and the alert is **discarded silently** — no
> error, no retry, and `ok: true` either way. Confirm the variable is set in
> Vercel, then force one real alert (e.g. insert a `webhooks` row with
> `processed_at` null and `received_at` older than the lag threshold, run
> `select public.fn_ops_alerts_tick();`, confirm the message arrives, then delete
> the row). Until that has been seen once, treat alerting as instrumented but
> not delivered.

**Built.** `app/api/cron/ops-alerts/route.ts` runs every 5 min (scheduled by the
`ticketiv-ops-alerts` **pg_cron** job → secured `CRON_SECRET` endpoint) and alerts
(to `OPS_ALERT_WEBHOOK_URL`) on: **failed payment callbacks / webhook lag**
(unprocessed webhooks older than N min), **payment success-rate** below a
threshold over a rolling window, and **health-URL** failures.

**Reconciliation conditions** now run in the same cron via
`public.fn_ops_reconciliation_counts()` — a service-role-only `SECURITY DEFINER`
function that returns anomaly **counts** (0 = healthy), so the cron gets them in
one call instead of expressing multi-table joins through PostgREST. Three
`evaluate*` checks in `lib/ops/health-alerts.ts` turn those counts into alerts:
- **`order-state-consistency`** (critical) — money/order/ledger integrity,
  mirroring `scripts/ops-reconciliation.sql` #1–#6, #9–#11 (succeeded-but-unpaid,
  paid-without-settlement-ledger, broken ledger invariant, unissued paid tickets,
  duplicate succeeded payments, refund-without-ledger, issued-on-unpaid, etc.).
- **`payout-integrity`** — over-draw (#7, critical) + `payouts.status = 'failed'`
  (warning).
- **`stuck-async-work`** — overdue `payment_outbox` (critical, payment
  finalization stuck) + stuck `notifications` and dead-lettered `jobs` (warning).

A reconciliation-query failure degrades to a single **skipped** check, never
failing the alert run. Delivery is unchanged (`postOpsAlert`).

### Where the 5-minute schedule lives (and why)

The cadence moved from GitHub Actions to **pg_cron** (migration
`20260804060000`). It ran on a GitHub-hosted runner every 5 minutes, and Actions
bills per *started* minute — ~8,640 runs/month against a 2,000-minute
private-repo allowance, i.e. the alert schedule alone was four times the entire
free budget and crowded out CI.

**Vercel Cron is not an option on this account.** The Vercel plan is Hobby, which
triggers cron jobs at most **once per day**; a 5-minute cadence cannot be
expressed there, and a `vercel.json` that asks for one fails the *production*
deployment. `lib/__tests__/ops-alert-schedule.test.ts` guards both homes — no
sub-daily cron may reappear in `.github/workflows/` or `vercel.json`.

**Configuration is in Vault, not in the migration**, so rotating the secret is a
one-line update rather than a schema change, and it never enters git.

The secret value must match `CRON_SECRET` in the Vercel project **exactly** —
`/api/cron/ops-alerts` returns 401 both when the token is wrong *and* when
`CRON_SECRET` is unset server-side, so a 401 does not tell you which side is
wrong. Check Vercel first.

Use the guarded form. A bare `create_secret('<placeholder>', …)` is genuinely
easy to run verbatim, and it stores the placeholder text as your secret — the
job then 401s instead of reporting itself unconfigured, which is the harder
failure to read:

```sql
do $$
declare
  -- ▼ replace this value only ▼
  v_secret text := 'PASTE_CRON_SECRET_HERE';
begin
  if v_secret = 'PASTE_CRON_SECRET_HERE' or v_secret like '<%>' then
    raise exception 'Placeholder not replaced — paste the real CRON_SECRET from Vercel';
  end if;
  perform vault.create_secret(v_secret, 'ops_alert_cron_secret');
end $$;
```

The URL is not a secret and is seeded already:
`select vault.create_secret('https://ticketiv.app/api/cron/ops-alerts', 'ops_alert_cron_url');`

Until both secrets exist the job **fails on every tick** (visible in
`cron.job_run_details`). That is deliberate — alerting that has silently stopped
is the failure this control exists to prevent.

**Checking that alerting actually ran.** `pg_net` is fire-and-forget:
`net.http_get()` returns as soon as the request is *queued*, so
`cron.job_run_details` shows success even when the endpoint is down. Each tick
therefore resolves the previous request against `net._http_response` and records
the real outcome in `public.ops_cron_runs` (30-day window):

```sql
-- Recent deliveries. ops_cron_runs.status_code is filled in by the *next* tick,
-- so join net._http_response to read the newest run too — otherwise the most
-- recent row always shows NULL and reads like a failure when it is just pending.
select r.requested_at,
       coalesce(r.status_code, resp.status_code)                       as status_code,
       coalesce(r.ok, resp.status_code between 200 and 299)            as ok,
       coalesce(r.error, resp.error_msg)                               as error
from public.ops_cron_runs r
left join net._http_response resp on resp.id = r.request_id
where r.job = 'ops-alerts'
order by r.requested_at desc
limit 20;
```

Note the SQL editor runs a whole batch in one transaction, so
`fn_ops_alerts_tick()` followed by a `select` in the same run always shows NULL —
pg_net only dispatches the queued request after commit. Run the tick, then the
query, as two separate executions.

Manual run (this replaced the workflow's **Run workflow** button):
`select public.fn_ops_alerts_tick();`

> **Known limit.** A scheduler cannot alert on its own death — true of the
> retired workflow too. If `pg_cron` itself stops, nothing here fires; the
> external signal is `ops_cron_runs` going quiet. Surfacing that on the
> super-admin ops page is the follow-up.

> **Baseline (2026-07-30).** `fn_teardown_uat_fixtures()` has been run and
> **all 14 counts read 0**. The UAT seed fixtures that previously made these
> alerts fire (2 paid orders without a settlement ledger, 1 overdue
> payment-outbox row, stuck notifications) are gone, so any future non-zero
> value reflects real activity. Note the database now holds **no transactional
> data at all** — a true pre-launch zero baseline.

**`in_app` notifications are deliberately excluded** from `stuck_notifications`
(migration `20260730200000`). `lib/notifications.ts` `emitNotification` inserts
in-app rows with `status = 'pending'` and nothing ever transitions them — the
in-app lifecycle is `read_at`, not `status`. Counting them would flag every
in-app notification older than the threshold as stuck, firing the alert
permanently under real traffic and training people to ignore it. Only dispatched
channels (email/sms/push), which get real `sent`/`failed` statuses from
`lib/notifications/transactional.ts`, are counted.

**Gap (To do).** **Scanner sync backlog** — `device_sessions` has no
`last_seen_at` and `scans` has no server-side "unsynced" flag, so a meaningful
backlog signal needs a schema addition (e.g. a heartbeat column) before it can
be added as a fourth `evaluate*`.

---

## 4. Backups & recovery (RPO/RTO) — **Runbook built; drill outstanding**

Project `radsfmlsjznqvcpogluo` ("Ticketiv"), region **eu-west-1**, Postgres
**17.6.1**, **383 MB**, 210 migrations applied.

### Read this first: what a database restore does NOT bring back

A Postgres restore is not a full recovery. Three things live outside it, and two
of them are unrecoverable if lost:

1. **`PAYOUT_ENCRYPTION_KEY` — the sharpest edge.** Organizer bank details are
   stored encrypted in `payout_accounts.details_encrypted`, keyed by this env
   var (`lib/payout-crypto.ts`). **Lose the key and a perfect database restore
   still yields unreadable payout accounts** — every organizer would have to
   re-enter bank details before any payout could run. Back this key up
   separately from both the database and Vercel, and treat rotating it as a
   migration, not a config change.
2. **Storage buckets** (`avatars`, `event-covers`) are object storage, **not**
   covered by a Postgres PITR restore. They need their own backup/copy step.
3. **`supabase_vault` secrets** are encrypted with a project-scoped key, so they
   do not necessarily survive a restore into a *new* project. Re-seed them.

### Objectives (proposed — confirm with the business)
- **RPO ≤ 5 minutes** for financial tables (requires PITR); ≤ 24h on daily
  snapshots alone.
- **RTO ≤ 2 hours.** At 383 MB the data restore itself is minutes — RTO is
  dominated by repointing env, redeploying and DNS, not by data volume.

### Prerequisite (cannot be verified from here)
**Confirm PITR is enabled** for the project in the Supabase dashboard
(Database → Backups). PITR is a paid-plan feature; without it the RPO is the
daily snapshot (up to 24h of lost orders), which is not compatible with the
RPO above. This is the one item that must be checked by a human with dashboard
access.

### Restore procedure
1. **Restore** the snapshot / PITR timestamp into a new project (same region,
   eu-west-1, to keep latency and any data-residency assumptions).
2. **Re-create the 8 `pg_cron` jobs** — they are database state and must be
   verified after any cross-project restore:
   `anon-user-cleanup` (`0 2 * * *`), `nightly_rollup_metrics` (`0 2 * * *`),
   `daily_analyze_public_schema` (`0 3 * * *`),
   `ticketiv-audit-log-retention` (`30 3 * * *`),
   `ticketiv-scans-retention` (`45 3 * * *`),
   `expire-stale-checkout-holds` (`*/5 * * * *`),
   `ticketiv-ops-alerts` (`*/5 * * * *`),
   `monitoring.capture_slow_queries_hourly` (`0 * * * *`).
   The retention and ops-alerts jobs are re-created by their migrations; the
   others are not. **`ticketiv-ops-alerts` also needs its Vault secrets
   re-seeded** (`ops_alert_cron_url`, `ops_alert_cron_secret`) — Vault contents
   do not survive into a new project, and without them alerting is dead while
   the job logs a failure every 5 minutes.
3. **Confirm extensions** exist: `pg_cron`, `pg_net`, `pgcrypto`, `pg_trgm`,
   `btree_gist`, `uuid-ossp`, `pg_stat_statements`, `supabase_vault`, `hypopg`,
   `index_advisor`.
4. **Restore storage** buckets `avatars` and `event-covers`.
5. **Repoint env** and redeploy. The must-change set:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`. Carry over unchanged (do **not** regenerate):
   `PAYOUT_ENCRYPTION_KEY`, `PAYSTACK_SECRET_KEY`, `CRON_SECRET`,
   `OPS_ALERT_WEBHOOK_URL`. Full inventory: `.env.example` (51 vars).
6. **Re-point the Paystack webhook** at the restored deployment, or completions
   will silently stop arriving.

### Verify the restore (do not declare recovery without this)
Run, in order, and require all four to be clean:
- `scripts/verify-rls.sql` — policies survived the restore.
- `scripts/ops-reconciliation.sql` — money integrity.
- `select public.fn_ops_reconciliation_counts();` — all 14 counts `0`.
- `select public.fn_provider_settlement_counts();` — provider comparison intact.

### Drill — **outstanding**
Do this once before launch, then quarterly: restore into a scratch project, walk
the procedure above, run the four verifications, and **record the wall-clock
time** to validate (or correct) the RTO ≤ 2h objective. Also record who holds
Supabase owner access and where `PAYOUT_ENCRYPTION_KEY` is escrowed.

**Gap (To do).** The drill itself — it needs Supabase dashboard access to create
a scratch project and trigger a restore, so it cannot be automated from the repo.
Until it has been run, RPO/RTO above are objectives, not measured facts.

---

## 5. Support / admin workflows — **Built**

The super-admin command centre (`app/super-admin/*`) covers payments, payouts,
exports, audit and flags. Documented workflows:

- **Refund dispute / chargeback:** confirm the payment + order in super-admin →
  issue a refund (creates `refunds` + `refund_items` + a `refund` ledger row) →
  the ticket moves to `refunded` → verify with `ops-reconciliation.sql` #6.
- **Revoked ticket (fraud / duplicate):** revoke the `order_item` (→ `revoked`,
  terminal) via the organizer/admin tool; the scanner then rejects it.
- **Duplicate charge:** `ops-reconciliation.sql` #5 lists orders with >1
  succeeded payment; refund the extra payment and reconcile.
- **Lost account access:** password reset / email change via Supabase Auth;
  ticket ownership follows the account, so no ticket transfer is needed.
- **Event cancellation:** pause then archive the event (`published → archived`);
  batch-refund outstanding paid orders; notify buyers.

**Dispute queue** (migration `20260730230000`). Previously a dispute existed only
as a sequence of manual steps — an admin found the payment, refunded or revoked,
and the fact that a customer had disputed anything survived only in someone's
memory. "What is outstanding right now?" was unanswerable, which is the question
support actually needs.

- **`disputes`** is the *case*, not the money movement: it references the order
  and payment, carries its own lifecycle
  (`open → investigating → awaiting_customer → resolved | rejected`), and links
  to the refund that settled it. Refunds remain the money record. Service-role
  only, RLS on.
- **`fn_open_dispute`** is idempotent on `dedupe_key`, so a redelivered webhook
  or a double-clicked admin action cannot create duplicate cases.
  **`fn_transition_dispute`** stamps `resolved_at` on terminal states and
  **refuses to reopen a closed dispute** — enforced in the database, not just the
  UI.
- **Chargebacks auto-open a dispute.** `fn_record_chargeback` now calls
  `fn_open_dispute` with a `chargeback:<payment_id>` dedupe key. Without this the
  queue would miss exactly the cases where money has already been clawed back,
  and a redelivered chargeback webhook still yields one case.
- **Queue UI:** `/super-admin/disputes` — open/investigating/unassigned/stale
  counts, "Take" (assign to me), "Resolve" and "Reject" with a resolution note.
  Gated to non-`read_only_admin`; every transition writes `audit_log`.
- **`fn_dispute_counts()`** exposes queue health (including `unassigned_open` and
  `stale_open > 7 days`) for the ops surface.

Verified with rolled-back tests: opening twice with one dedupe key produced a
single case; the lifecycle stamped `resolved_at`; reopening a closed dispute was
refused; and a chargeback opened exactly one dispute (kind `chargeback`, amount
carried) alongside the reversal ledger entry and the order flipping to
`refunded`.

**Gap (To do).** Resolving a dispute records the outcome — it does **not** move
money. The refund is still issued from the payment first, then the dispute
resolved. Wiring "resolve + refund" into one action would remove that last
two-step, but it deliberately keeps money movement explicit for now.

---

## 6. Audit & scan retention — **Built**

**Built.** `audit_log` (financial + admin actions) is kept to a rolling window
(default **24 months**) with older rows moved to a cold `audit_log_archive`
table rather than hard-deleted, so the legal retention minimum for financial
records is preserved while the hot table stays small (migration
`20260728130000_audit_log_retention`).

- `public.fn_archive_audit_log(p_retention interval default '24 months',
  p_batch_limit integer default 10000)` archives one batch of rows older than the
  cutoff and prunes them in a **single snapshot** (the INSERT sees pre-delete
  rows), so a crash never deletes without archiving; it returns the batch counts.
  Service-role only (revoked from anon/authenticated).
- `audit_log_archive` mirrors `audit_log` (primary key preserved), has RLS on and
  no client grants — reachable only through the SECURITY DEFINER function or
  service_role.
- Scheduled daily at **03:30 UTC** via **pg_cron** (`ticketiv-audit-log-retention`;
  the migration schedules it only where pg_cron is present, so a fresh replay
  without the extension skips it cleanly).

Verified with a rolled-back run: a 30-day cutoff archived 32 old rows and pruned
them (hot 63 → 31, archive 0 → 32) with every pruned row present in the archive.

**UAT fixture cleanup — two paths, don't confuse them.** Dev/UAT/prod share one
Supabase project, so test rows are production rows. There are two distinct
cleanup mechanisms and each only reaches its own data:

| Data | Tool | Matches on |
|---|---|---|
| UAT runs you marked (`uat-YYYYMMDD-name` in names/emails/refs) | `scripts/cleanup-uat-fixtures.sql` | the exact run marker; dry-run by default |
| The original seeded fixture set from `fn_seed_uat_fixtures()` (`da7a0000-…` orgs) | `public.fn_teardown_uat_fixtures()` | hard-coded fixture org/user ids |

The seeded `da7a…` fixtures carry **no** run marker, so the marker script cannot
see them — use the teardown function for those. `fn_teardown_uat_fixtures()` was
run on **2026-07-30**, clearing 6 orders / 3 payments / 5 ledger rows / 1 payout
/ 1 refund / 1 scan across both fixture orgs, and reconciliation now reads 0
across the board.

**`scans` retention** (migration `20260730220000`) is now built too, and the
trigger concern that deferred it turned out to be real: of the four triggers on
`scans`, three are BEFORE INSERT (irrelevant to archiving), but
`trg_recalc_event_live_stats_scans` fires **AFTER DELETE** and recalculates
`event_live_stats`, whose `checked_in_count` / `last_scan_at` are derived by
**counting `public.scans`**. Pruning naively would have silently reset historical
attendance for past events to zero.

Rather than suppress the trigger during the prune (stateful, and wrong the moment
any later recalc runs), archiving was made **stat-neutral**: the recalc now counts
`scans` **union** `scans_archive`, so an archived scan still counts toward its
event. Verified with a rolled-back test — 3 scans (2 `valid`) gave
`checked_in_count = 2`; after archiving all 3, live rows were 0 and
`checked_in_count` was **still 2**, with `last_scan_at` preserved.

- `public.fn_archive_scans(p_retention default '12 months', p_batch_limit)` —
  copy-then-delete in a single snapshot, service-role only. Only scans belonging
  to events that have **already ended** are eligible, so an in-flight gate is
  never touched.
- Scheduled daily at **03:45 UTC** via pg_cron (`ticketiv-scans-retention`).
- Retention is operational, not financial: scans are gate telemetry, and the
  durable record of who was admitted is `order_items.status = 'checked_in'`.

**Gap (To do).** Decide whether the cold archives should eventually export to
object storage and purge, and record the legal retention minimum for financial
records. Separately, `fn_seed_uat_fixtures` /
`fn_teardown_uat_fixtures` exist on the database with **no migration backing
them** and are absent from `supabase/permissions/rpc-grants.json`, so the
live-drift half of `check:permissions` will flag them once CI can run again —
decide whether to back them with a migration, drop them, or adopt them into the
snapshot.

---

## 7. Rate limits — **Built (core paths covered)**

**Built.** A shared fixed-window primitive — the `rate_limits` table and
`public.fn_rate_limit(p_key, p_max, p_window_seconds)` (returns true = allowed)
plus `fn_rate_limit_gc()` for housekeeping (migration
`20260720160000_rate_limit_primitive`). `fn_rate_limit`, `fn_rate_limit_gc` and
`fn_rate_limit_edge` are EXECUTE-revoked from `anon`/`authenticated` and granted
only to `service_role` (migration `20260726121500` makes this explicit so a
fresh replay can't leave them anon-callable via Supabase's grant-on-create event
trigger), so only trusted SECURITY DEFINER RPCs / server-side code call them.
**Consumers wired** (each verified against prod with a rolled-back test — the
last allowed call passes, the next is rejected with `rate_limited`):

| RPC (guard location) | Bucket | Limit | Migration |
|---|---|---|---|
| `fn_create_membership_invite_unchecked` (worker) | `invite:<uid>` | 30 / hour | `20260720160000` |
| `fn_create_organization_unchecked` (worker) | `org_create:<uid>` | 5 / hour | `20260726121000` |
| `fn_create_inventory_protected_order` (monolith) | `checkout:<buyer>` | 10 / min | `20260726120000` |
| `fn_request_transfer_by_email` (shim) | `transfer:<uid>` | 20 / hour | `20260726121000` |
| `fn_publish_resale_listing` (shim) | `resale_publish:<uid>` | 20 / hour | `20260726121000` |

The guard sits in the `_unchecked` worker for the claimed-account RPCs (invite,
org) — main's refactor split those into a `require_claimed_account()` shim over a
service-role worker, and the worker is the stable body — and in the shim for
transfers/resale. The rollout migrations are dated after main's claimed-account
refactor so they apply last on a fresh replay and land on the final bodies.

The checkout guard sits after the four entry validations and before any
inventory/pricing work, so a rapid-fire attacker is rejected before touching
the row locks; it complements the per-ticket-type `per_user_limit` / quota /
10-minute holds.

**Edge / anon endpoints are covered too.** `lib/rate-limit.ts` (used by the
promo preview, payment attempt, auth resend, waitlist join, scanner
provision/validate, search suggest and tapband telemetry routes) prefers
Upstash Redis but previously **degraded to a no-op when Upstash was
unconfigured**, silently disabling those limits. It now falls back to the same
durable Postgres counter via `public.fn_rate_limit_edge(bucket, key, max,
window)` — a service-role-only `SECURITY DEFINER` wrapper around `fn_rate_limit`
(migration `20260720162000`, buckets namespaced under `edge:`). The wrapper is
EXECUTE-revoked from `anon`/`authenticated` and only reachable through the
server-side admin client, so a browser can't poke the counter. This closes the
**`fn_preview_promo_code`** anon-enumeration gap: the promo route keys the limit
by client IP (`clientKey(req)` → 20/min) and it is now enforced without Redis.
Any DB/config error fails open (allow), preserving availability over
enforcement.

**Apply the DB primitive to the remaining SECURITY DEFINER entry points** by
adding, right after the RPC's auth check:

```sql
if not public.fn_rate_limit('<action>:' || v_user::text, <max>, <window_secs>) then
  raise exception 'rate_limited' using errcode = 'P0001';
end if;
```

Transfers (`fn_request_transfer_by_email`) and resale publication
(`fn_publish_resale_listing`) are guarded at **20 / user / hour** each — the
guard sits between `app.require_claimed_account()` and the `*_unchecked` worker,
so it blocks recipient-email enumeration and listing spam without touching
legitimate use.

**`fn_scan_ticket` is intentionally left to the edge, not DB-guarded.** Gate
scanning is high-throughput and offline-first, so a per-call DB counter would
risk throttling legitimate scan bursts; the scanner is already covered at the
edge by the `scanner:provision` and `scanner:validate` route limits, which are
now durable via the edge fallback above.

**Housekeeping is scheduled.** `fn_rate_limit_gc()` runs on every ops-alerts
cron pass (`app/api/cron/ops-alerts/route.ts`, every 5 min, best-effort) so
`public.rate_limits` self-prunes expired windows. Pair all of the above with
Vercel/WAF network limits for defence in depth.

---

## Quick reference

| Control | Status | Primary artifact |
|---|---|---|
| Reconciliation | Built | `scripts/ops-reconciliation.sql`, `fn_org_finance_summary`, `provider_settlements` + daily ingest |
| Webhook idempotency/replay | Built | `webhooks`/`payments` unique keys + admin Reprocess on the dead-letter list (Paystack only) |
| Alerting | Built | `api/cron/ops-alerts` + `fn_ops_reconciliation_counts` (order/payout/async checks); scanner backlog needs a heartbeat column |
| Backups / RPO-RTO | Partial | runbook written (incl. PAYOUT_ENCRYPTION_KEY / storage / cron caveats); PITR confirmation + drill outstanding |
| Support workflows | Built | `app/super-admin/*` + `/super-admin/disputes` queue; chargebacks auto-open a case |
| Audit & scan retention | Built | `fn_archive_audit_log` + `fn_archive_scans` with cold archives, daily pg_cron; scan archiving is stat-neutral |
| Rate limits | Built | `fn_rate_limit` on invites/org/checkout/transfer/resale; edge routes durable via `fn_rate_limit_edge`; gc scheduled in ops cron |
