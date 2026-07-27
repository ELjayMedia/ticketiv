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
| Reconciliation | Partial | `scripts/ops-reconciliation.sql`, `fn_org_finance_summary` |
| Webhook idempotency/replay | Partial | `webhooks`/`payments` unique keys; replay tool = to do |
| Alerting | Partial | `api/cron/ops-alerts`; extend with reconciliation checks |
| Backups / RPO-RTO | To do | Supabase PITR + documented drill |
| Support workflows | Partial | `app/super-admin/*` + runbooks above |
| Audit retention | To do | scheduled archive+prune job |
| Rate limits | Built | `fn_rate_limit` on invites/org/checkout/transfer/resale; edge routes durable via `fn_rate_limit_edge`; gc scheduled in ops cron |
