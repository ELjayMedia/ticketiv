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
 * `order_gross` is the amount collected from the buyer (`total_cents`). Fees are
 * stored as negative rows, and `payment_net` is the amount remaining for the
 * organizer after those fees. Invariant:
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
  const processorFee = order.processor_fee_cents ?? 0
  const net = gross - platformFee - processorFee

  return [
    { org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "order_gross", amount_cents: gross, currency: order.currency, meta: { source: "payment_completion" } },
    ...(platformFee > 0 ? [{ org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "fee" as const, amount_cents: -platformFee, currency: order.currency, meta: { fee_type: "platform" } }] : []),
    ...(processorFee > 0 ? [{ org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "fee" as const, amount_cents: -processorFee, currency: order.currency, meta: { fee_type: "processor" } }] : []),
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
