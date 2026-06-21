# Ticketiv Operations Runbook (TICK-181)

Operational procedures for the production stack: **Next.js 16 on Vercel** +
**Supabase** (project `radsfmlsjznqvcpogluo`) + **Paystack** payments.
Money is integer cents; the double-entry ledger (`ledger_entries`) is the
source of truth for org finances.

> Conventions: "service role" = `createAdminClient()` server paths only.
> Never run raw `psql` against the VPS; use the Supabase MCP / CLI. Apply
> migrations only after sign-off.

---

## 1. Backup & restore

### Backups
- Supabase takes automated daily backups (Pro plan: PITR window per project
  settings). Verify retention in **Supabase Dashboard → Database → Backups**.
- Schema baseline lives in `supabase/migrations/` — see
  `docs/MIGRATION_RECONCILIATION.md`. **Action item (TICK-171):** the repo
  baseline is incomplete until `supabase db pull` output is committed; until
  then the DB itself is the only complete schema source.

### Point-in-time restore (data loss / bad deploy)
1. Freeze writes: in **Vercel**, set the app to maintenance (or scale the
   deployment to 0 / enable a maintenance env flag) so no new orders/scans land.
2. Supabase Dashboard → Database → Backups → **Restore** to the target
   timestamp (PITR) into a NEW project/branch first — never restore in place
   blind.
3. Validate the restored copy: row counts on `orders`, `payments`,
   `ledger_entries`, `order_items`; confirm latest `webhooks.received_at`.
4. Cut over: point `DATABASE_URL` / Supabase keys at the restored project,
   redeploy, lift maintenance.

### Schema rebuild (fresh environment)
Once TICK-171's `supabase db pull` baseline is committed:
```bash
supabase db reset      # applies supabase/migrations/ from scratch
```

---

## 2. Payments incident response (Paystack)

**Pipeline:** buyer → Paystack hosted page → webhook
`POST /api/payments/paystack/webhook` → signature verify → idempotency check
on `webhooks(provider, provider_event_id)` → `completePaystackPaymentFromWebhook`
→ ledger write (`writePaymentLedger`) → `completePaidOrder` → ticket delivery.
Errors are reported to Sentry (`area: paystack-webhook` / `ledger` / `payment-completion`).

### Symptom: buyer paid, no tickets / order stuck `pending`
1. Find the order: `orders` by `id` / `buyer_email`. Note `status`,
   `total_cents`.
2. Check `payments` for that `order_id`: a `succeeded` row means the webhook
   completed; none means the webhook didn't arrive or failed.
3. Check `webhooks` for the provider event (search `payload->'data'->>'reference'`
   or `provider_event_id`). `processed_at IS NULL` = received but not completed.
4. Check Sentry for the matching exception. Common causes:
   - **Amount mismatch** → webhook rejected on purpose (`data.amount` ≠
     `order.total_cents`). Investigate tampering / wrong currency before any
     manual completion.
   - **Order already settled** → idempotent no-op (200). No action.
5. Paystack-side: confirm the transaction in the Paystack dashboard
   (Transactions → reference). If Paystack shows success but we have no
   `payments` row, **replay the webhook** (§3).
6. Never hand-insert into `payments`/`order_items` directly — re-drive the
   verified webhook so the ledger + delivery run atomically through the RPC.

### Symptom: duplicate charge
- The unique index on `webhooks(provider, provider_event_id)` and
  `ui_payments_provider_ext` on `payments(provider, ext_payment_id)` prevent
  double-completion. If a buyer was charged twice by Paystack itself, issue a
  refund (§ below) — do not delete ledger rows.

### Refunds
- Refunds are recorded in `refunds` (status enum
  `requested|processing|processed|failed|cancelled`) and `refund_items`, and
  must post a `refund` ledger entry. Organizer-initiated refunds go through the
  org orders action; status starts `requested`. Reconcile the provider refund
  reference into `refunds.provider_ref`.

---

## 3. Webhook replay

When a Paystack event was missed or failed processing:
1. Get the event reference from the Paystack dashboard (Transactions → event).
2. Preferred: use **Paystack → resend webhook** for that transaction so a
   fresh, signature-valid delivery hits `/api/payments/paystack/webhook`.
3. The handler is idempotent: an already-settled order returns 200 without
   re-crediting; an unprocessed one completes normally.
4. If the row exists in `webhooks` with `processed_at IS NULL` and replay must
   be forced, clear the dedupe by confirming the order is still `pending`, then
   resend from Paystack (do **not** fabricate a payload — signature
   verification will reject it).
5. Outbound webhooks to org endpoints live in `webhook_endpoints` /
   `webhook_deliveries`; `idx_webhook_deliveries_pending` finds undelivered
   rows (`delivered_at IS NULL AND next_retry_at IS NOT NULL`). Re-enqueue via
   the dispatch path rather than editing rows.

---

## 4. Payout failure handling

- Payouts: `payouts` (status `requested|processing|paid|failed|cancelled`) +
  `payout_accounts` (`details_encrypted` — never expose to the browser).
  Requests are gated on org admin + a configured payout account
  (`fn_request_payout`).
- **A payout shows `failed`:**
  1. Read the provider error from the payout record / Sentry.
  2. Confirm `payout_accounts.details_encrypted` decrypts to valid destination
     details (`lib/payout-crypto`).
  3. Verify org balance from the ledger:
     `SELECT sum(amount_cents) FROM ledger_entries WHERE org_id = $1;`
     (net of `payment_net`, `fee`, `refund`, `payout`, `reversal`).
  4. Do not retry by editing `payouts.status`. Re-request through the gated RPC
     so a new ledger `payout` entry is written.
- **Reconciliation:** the admin CSV exports (`/api/super-admin/exports/*`)
  produce ledger/orders/audit extracts with SZL decimal companion columns.

---

## 5. Index review (follow-up to the TICK-181 migration)

`supabase/migrations/20260620170000_index_hygiene.sql` (pending sign-off) adds
the missing `order_items.current_owner_id` FK index and drops 5 exact-duplicate
indexes. The advisor's remaining ~155 "unused" indexes are **not** dropped
blindly:
1. Let production run a representative window (e.g. 2–4 weeks incl. an on-sale).
2. `SELECT relname, indexrelname, idx_scan FROM pg_stat_user_indexes
   WHERE schemaname='public' AND idx_scan = 0 ORDER BY relname;`
3. Cross-check each zero-scan index against known query paths (data layer in
   `lib/data/**`) before proposing drops in a follow-up migration.
4. `monitoring.estimate_index_bloat` / `monitoring.slow_queries_summary` (live
   helpers) inform priority.

---

## 6. Staging environment  — SETUP REQUIRED (infra)

Not stood up from this session (needs Supabase/Vercel account access). Target:
- **DB:** Supabase preview **branch** off `radsfmlsjznqvcpogluo`
  (`supabase branches create staging`) — gets an isolated Postgres with the
  same migrations. Seed with the existing
  `...seed_ticketiv_four_test_events...` migration + a handful of test orgs.
- **App:** Vercel **Preview** deployment bound to the branch's Supabase keys;
  Paystack in **test mode** (`payment_provider_settings.mode = 'test'`).
- **Guardrails:** never point staging at live payout/provider secrets; use
  Paystack test keys; disable real WhatsApp/SMS/email sends (stub adapters).
- **Acceptance:** staging URL reachable, can complete a test-mode checkout end
  to end, scanner validates a ticket.

---

## 7. Load-test baseline — SETUP REQUIRED (infra)

Not executed from this session. Plan (k6 or Artillery against staging):
- **Checkout path:** `POST /api/payments/attempt` (rate-limited 10/60s/user) →
  measure p50/p95/p99 and error rate at 10/50/100 concurrent buyers. Watch DB
  via `monitoring.capture_slow_queries`.
- **Scan path:** `POST /api/scanner/validate` (rate-limited 120/60s) at gate-
  burst rates (e.g. 50 scans/s) — confirm `scans_one_success_per_ticket`
  unique index holds and no double-admits.
- **Search:** `/api/search/suggest` (60/60s) under browse load.
- **Record:** commit baseline numbers to `docs/loadtest/BASELINE.md` with date,
  dataset size, and the commit SHA tested.

---

## Quick reference — key tables/RPCs
| Concern | Object |
|---|---|
| Money truth | `ledger_entries` (double-entry), `fn_org_finance_summary` |
| Orders | `orders`, `order_items` (1 row = 1 ticket, `ticket_code`) |
| Payments | `payments`, `payment_attempts`, `webhooks` |
| Payouts | `payouts`, `payout_accounts`, `fn_request_payout` |
| Refunds | `refunds`, `refund_items` |
| Scanning | `scans`, `fn_scan_ticket` |
| Async work | `jobs`, `webhook_deliveries` |
| Live counters | `event_live_stats`, `mv_event_sales`, `mv_revenue_breakdown` |
