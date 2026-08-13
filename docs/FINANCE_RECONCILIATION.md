# Finance reconciliation queue runbook

This runbook is for payment/order/ledger discrepancies recorded in `public.finance_reconciliation_issues` and exposed through the RLS-filtered `public.v_finance_reconciliation_queue` view.

The queue is an operational control, not part of checkout. `fn_refresh_finance_reconciliation_issues()` is service-role only and is called by the existing ops-alerts run. It scans the six launch-critical payment integrity conditions and upserts one stable row per offending entity. When a condition disappears, an `open` or `acknowledged` issue is automatically moved to `resolved`; if the same condition later returns, the same row reopens.

## Detector keys

| Detector | Meaning | First response |
| --- | --- | --- |
| `paid_order_without_succeeded_payment` | Order says paid but no succeeded payment exists. | Hold fulfilment/payout investigation; verify how the order reached `paid`. |
| `succeeded_payment_without_paid_order` | Provider payment succeeded but order completion did not reach `paid`. | Do not charge again. Reconcile/replay the trusted completion path. |
| `payment_amount_mismatch` | Succeeded payment amount or currency differs from the order contract. | Stop payout for the affected order/org and verify provider transaction data. |
| `duplicate_provider_reference` | One provider reference is attached to more than one payment row. | Treat as platform-level critical; do not mutate either payment until the provider record is verified. |
| `payment_ledger_without_payment` | Settlement-composition ledger row has no `payment_id`. | Hold payout and trace the writer; never repair by inventing a payment link. |
| `payment_attempt_link_mismatch` | A succeeded attempt is not linked to the matching succeeded payment/order/provider/reference. | Reconcile completion bookkeeping before retrying any payment action. |

## Operator workflow

1. Read active issues from `v_finance_reconciliation_queue`, prioritising `critical` and oldest first.
2. Open the linked `order_id` / `payment_id` in the organizer or super-admin support surfaces and compare the provider reference with Paystack before changing money state.
3. Acknowledge the issue from `/super-admin/reconciliation`. This calls `fn_update_finance_reconciliation_issue(issue_id, 'acknowledged', note)` and records the current user as owner when the issue has no owner yet.
4. Fix the root cause through the normal trusted workflow. Do **not** edit payment amounts, ledger values, provider references, or queue detector fields directly.
5. Run/allow the next reconciliation refresh. If the detector clears, the issue auto-resolves. Use an explicit `resolved` status only when the underlying state is already verified correct and the refresh cadence has not run yet; a resolution note is required.
6. Use `ignored` only for a documented false positive. A note is required, and ignored issues remain persisted while receiving `last_detected_at` updates if the detector still fires.

## Useful queries

```sql
-- Active platform/admin queue. RLS limits org-finance users to their org.
select *
from public.v_finance_reconciliation_queue
where status in ('open', 'acknowledged')
order by (severity = 'critical') desc, first_detected_at asc;

-- Service-role/manual refresh. The ops-alerts job does this automatically.
select public.fn_refresh_finance_reconciliation_issues();
```

## Payout gate

Any active issue tied to an organization should block manual confidence in that organization's payout until the discrepancy is understood. A platform-scoped `duplicate_provider_reference` is treated as a global finance incident because it can cross organizations.

The queue complements `scripts/ops-reconciliation.sql`, `fn_ops_reconciliation_counts()`, provider-settlement reconciliation, and the ops-alert webhook. Aggregate alerts answer **whether** something is wrong; this queue preserves **which entity**, **who owns it**, and **whether it was resolved**.
