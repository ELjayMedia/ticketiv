// Pure money-path helpers — no DB, no server-only imports — so the ledger
// math and webhook idempotency decisions are unit-testable in isolation
// (TICK-174). lib/payments.ts imports these and supplies the I/O.
import type { Json } from "@/types/database"

export interface LedgerOrderInput {
  id: string
  org_id: string
  total_cents: number
  currency: string
  subtotal_cents?: number | null
  platform_fee_cents?: number | null
  processor_fee_cents?: number | null
  organizer_net_cents?: number | null
}

export interface LedgerEntryDraft {
  org_id: string
  order_id: string
  payment_id: string
  type: "order_gross" | "fee" | "payment_net"
  amount_cents: number
  currency: string
  meta: Json
}

/**
 * Build settlement ledger rows for a completed payment.
 *
 * `order_gross` is the amount collected from the buyer (`total_cents`). The
 * platform commission is the single organizer-side deduction; processor cost
 * is absorbed inside that commission and stays on the order for internal
 * reconciliation. `payment_net` is the organizer's snapshotted net. Invariant:
 *
 *   order_gross + sum(fee) === payment_net
 *
 * `subtotal_cents` remains useful for order presentation and discount
 * reconciliation, but it must not be used as the collected gross when buyer
 * fees are included in `total_cents`.
 */
export function buildLedgerEntries(order: LedgerOrderInput, paymentId: string): LedgerEntryDraft[] {
  const gross = order.total_cents
  const platformFee = order.platform_fee_cents ?? 0
  const net = order.organizer_net_cents ?? gross - platformFee

  return [
    { org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "order_gross", amount_cents: gross, currency: order.currency, meta: { source: "payment_completion" } },
    ...(platformFee > 0 ? [{ org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "fee" as const, amount_cents: -platformFee, currency: order.currency, meta: { fee_type: "platform" } }] : []),
    { org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "payment_net", amount_cents: net, currency: order.currency, meta: { source: "payment_completion" } },
  ]
}

export type PaystackWebhookDecision = "fail" | "duplicate" | "amount_mismatch" | "proceed"

/**
 * Decide how a Paystack webhook should be handled, given the event status,
 * the current order status, and the provider-reported amount. Pure mirror of
 * the guard sequence in the webhook completion path so it can be tested
 * without a DB:
 *   - non-success event            -> fail the attempt
 *   - order already settled        -> idempotent duplicate (ack, no re-credit)
 *   - amount present but mismatched -> reject (tamper / wrong currency)
 *   - otherwise                    -> proceed to completion
 */
export function evaluatePaystackWebhookOutcome(input: {
  status: string
  orderStatus: string
  orderTotalCents: number
  amount: number
}): PaystackWebhookDecision {
  if (input.status !== "success") return "fail"
  if (input.orderStatus !== "pending") return "duplicate"
  if (input.amount && input.amount !== input.orderTotalCents) return "amount_mismatch"
  return "proceed"
}

export type ProviderVerificationDecision =
  | "proceed"
  | "not_successful"
  | "reference_mismatch"
  | "amount_mismatch"
  | "currency_mismatch"

/**
 * Decide whether a provider's verify-transaction response authorises completion
 * (TICK-339). Unlike `evaluatePaystackWebhookOutcome`, which grades a payload
 * the provider pushed to us, this grades a response we pulled from the provider
 * for a reference we already hold, so every field is expected to be present and
 * a missing amount is a rejection rather than a skipped check.
 *
 * Both the webhook and the buyer-initiated completion path funnel through the
 * same service-role completion RPC; this is the gate in front of the buyer path.
 */
export function evaluateProviderVerification(input: {
  providerStatus: string
  providerReference: string
  providerAmountCents: number
  providerCurrency: string
  expectedReference: string
  expectedAmountCents: number
  expectedCurrency: string
}): ProviderVerificationDecision {
  if (input.providerStatus?.toLowerCase() !== "success") return "not_successful"

  const providerRef = (input.providerReference ?? "").trim()
  const expectedRef = (input.expectedReference ?? "").trim()
  if (!providerRef || !expectedRef || providerRef !== expectedRef) return "reference_mismatch"

  if (!Number.isFinite(input.providerAmountCents) || input.providerAmountCents !== input.expectedAmountCents) {
    return "amount_mismatch"
  }

  const providerCurrency = (input.providerCurrency ?? "").trim().toUpperCase()
  const expectedCurrency = (input.expectedCurrency ?? "").trim().toUpperCase()
  if (!providerCurrency || !expectedCurrency || providerCurrency !== expectedCurrency) return "currency_mismatch"

  return "proceed"
}
