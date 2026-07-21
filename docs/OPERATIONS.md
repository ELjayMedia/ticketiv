# Ticketiv — Operational Controls

Operational readiness for handling real customer money. Each control is marked
**Built**, **Partial**, or **To do**, with the concrete procedure and the gap.
Money is integer cents; `SZL`; the ledger's settlement rows carry a `payment_id`
and satisfy `sum(order_gross) + sum(fee) = sum(payment_net)`.

---

## 1. Payment reconciliation — **Partial**

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

**Gap (To do).** Comparison against **provider settlement reports** (Paystack
settlements: gross received, provider fees, payout to bank). That requires
ingesting Paystack's settlement API/CSV into a `provider_settlements` table and
reconciling it against `payments`/`payouts`. Until then, reconciliation is
internal-only (our ledger vs our orders), not internal-vs-provider.

---

## 2. Webhook replay, idempotency & dead-letter — **Partial**

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

**Gap (To do).** A **safe replay tool**: an admin action / RPC that re-runs
`completeTrustedPaystackWebhook` for a stored (verified) `webhooks.payload`,
guarded by the existing idempotency so replay is safe. Today reprocessing is
manual (re-POST the stored payload to the webhook route). Add an admin
"reprocess" button over the dead-letter list.

---

## 3. Alerting — **Partial**

**Built.** `app/api/cron/ops-alerts/route.ts` runs every 5 min
(`.github/workflows/ops-alerts.yml` → secured `CRON_SECRET` endpoint) and alerts
(to `OPS_ALERT_WEBHOOK_URL`) on: **failed payment callbacks / webhook lag**
(unprocessed webhooks older than N min), **payment success-rate** below a
threshold over a rolling window, and **health-URL** failures.

**Gap (To do).** Extend the cron with the remaining conditions — the detection
SQL already exists in `scripts/ops-reconciliation.sql`:
- **Inconsistent order states** (checks #1, #2, #4, #9, #10).
- **Payout errors / over-draw** (check #7; plus `payouts.status = 'failed'`).
- **Scanner sync backlog** (device_sessions active but `last_seen_at` stale, or
  a spike in offline/unsynced scans).
- **Failed jobs** (e.g., notifications/outbox rows stuck `pending`).

Add each as an `evaluate*` in `lib/ops/health-alerts.ts` and include it in the
cron's `checks` array. Delivery already exists (`postOpsAlert`).

---

## 4. Backups & recovery (RPO/RTO) — **To do (mostly documentation + drill)**

Supabase provides automated daily backups and, on Pro/managed plans,
**Point-in-Time Recovery (PITR)**. Confirm PITR is enabled for project
`radsfmlsjznqvcpogluo` in the Supabase dashboard (Database → Backups).

**Objectives (proposed — confirm with the business):**
- **RPO ≤ 5 minutes** (PITR WAL) for financial tables; ≤ 24h (daily snapshot)
  otherwise.
- **RTO ≤ 2 hours** to restore into a new project + repoint `NEXT_PUBLIC_*` /
  service-role env and redeploy.

**Recovery drill (do once before launch, then quarterly):** restore a PITR
snapshot into a scratch project, run `scripts/verify-rls.sql` and
`scripts/ops-reconciliation.sql` against it, and record the actual
recovery time. Document the runbook: who has Supabase owner access, where env
values live, and the Vercel promote/rollback steps.

---

## 5. Support / admin workflows — **Partial (tooling exists; runbooks below)**

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

**Gap (To do).** A first-class "dispute" object/queue and one-click flows for the
above (today several are multi-step or manual).

---

## 6. Audit retention — **To do**

`audit_log` (financial + admin actions) and `scans` grow unbounded. Define a
retention policy — proposed: **keep 24 months hot**, archive older rows to cold
storage (a `audit_log_archive` table or object storage export), then delete.
Implement as a scheduled RPC (pg_cron or the ops cron) that archives+prunes on a
cutoff, and document the legal retention minimum for financial records. Nothing
prunes today.

---

## 7. Rate limits — **To do**

No rate limiting exists today. Abuse-sensitive entry points that need limits:
`fn_preview_promo_code` (code enumeration), checkout/order creation, ticket
transfers, resale publication, membership invitations, `fn_scan_ticket`, and
organization creation.

**Recommended approach:** a small DB token-bucket (`rate_limits(key, window,
count)` + a `SECURITY DEFINER` `fn_rate_limit(p_key, p_max, p_window)` that the
sensitive RPCs call at entry, keyed by `auth.uid()` / IP / org), plus coarse
edge limits in `middleware.ts` for unauthenticated endpoints
(promo preview, order creation). Pair with Vercel/WAF limits for network-level
protection. This is net-new and should ship as its own reviewed change.

---

## Quick reference

| Control | Status | Primary artifact |
|---|---|---|
| Reconciliation | Partial | `scripts/ops-reconciliation.sql`, `fn_org_finance_summary` |
| Webhook idempotency/replay | Partial | `webhooks`/`payments` unique keys; replay tool = to do |
| Alerting | Partial | `api/cron/ops-alerts`; extend with reconciliation checks |
| Backups / RPO-RTO | To do | Supabase PITR + documented drill |
| Support workflows | Partial | `app/super-admin/*` + runbooks above |
| Audit retention | To do | scheduled archive+prune job |
| Rate limits | To do | `fn_rate_limit` + middleware |
