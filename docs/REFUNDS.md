# Refund operations (TICK-352)

Ticketiv keeps one provider-neutral refund lifecycle and delegates monetary execution to the payment provider that owns the original successful payment.

## Provider matrix

| Provider | Initiation | Reconciliation | Completion |
|---|---|---|---|
| Paystack | Automatic | Paystack API/webhook + cron fallback | Provider-confirmed |
| MTN MoMo | Automatic via Disbursement Refund | GetRefundStatus + refund cron | Provider-confirmed |
| DeltaPay | Manual provider operation | Manual evidence | Finance/admin confirmation |
| Other/legacy | Manual provider operation | Manual evidence | Finance/admin confirmation |

A refund must not be marked `processed` just because it was requested or approved. The `processed` transition is the money-confirmed boundary: the existing `fn_transition_refund` path then updates ticket/refund state and writes the refund ledger effects.

## MTN MoMo refund configuration

Collections and Disbursements have separate subscription keys. Existing MoMo checkout continues to use:

- `MOMO_COLLECTIONS_PRIMARY_KEY`
- `MOMO_API_USER`
- `MOMO_API_KEY`
- `MOMO_BASE_URL`
- `MOMO_ENVIRONMENT`

Native refunds additionally require the Disbursements product subscription:

- `MOMO_DISBURSEMENT_PRIMARY_KEY` — required
- `MOMO_DISBURSEMENT_API_USER` — optional override; falls back to `MOMO_API_USER`
- `MOMO_DISBURSEMENT_API_KEY` — optional override; falls back to `MOMO_API_KEY`

The adapter creates a new UUID refund reference before the network call and stores it in `refunds.provider_ref`. It submits the original successful MoMo RequestToPay reference (`payments.ext_payment_id`) as the transaction being refunded. A network-uncertain submission stays `processing` and is reconciled with GetRefundStatus rather than being submitted a second time.

The refund cron polls processing rows with provider references. MoMo maps provider states as follows:

- `PENDING` → Ticketiv remains `processing`
- `SUCCESSFUL` → `processed`
- `FAILED` → `failed`

## Manual-provider completion

For providers without a native refund adapter, approval moves the refund from `requested` to `processing` and records `manual_refund.required=true` in `provider_payload`.

A finance/admin/owner-level operator must complete the monetary refund outside Ticketiv, then use **Confirm refund completed** on the order support screen. The operator must provide:

1. the provider's refund/transaction reference; and
2. a completion note describing where/how the refund was completed.

The action rejects Paystack and MoMo because automated providers may only complete from provider-confirmed status. For a manual provider it calls `fn_transition_refund(..., 'processed', ...)`, preserving the existing idempotent ticket and ledger finalisation path, and writes a `manual_refund_completed` audit entry.

## Safety rules

- Never route a refund to a provider different from the original payment provider.
- Never manually complete Paystack or MoMo refunds.
- Never finalise a DeltaPay/manual refund until the external money movement has actually been completed.
- Provider reference and completion note are mandatory for manual completion.
- Ordinary organizer support can approve refunds, but manual monetary completion is restricted to admin, organizer owner/admin, finance, or finance-manager roles.
