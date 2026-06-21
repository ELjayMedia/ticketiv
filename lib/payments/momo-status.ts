// Pure MoMo settlement decision — no DB — mirrors evaluatePaystackWebhookOutcome
// so the collection status flow is unit-testable (TICK-179). The HTTP routes
// supply the actual MoMo status + the persisted attempt/order state.
import type { MomoStatus } from "@/lib/payments/momo"

export type MomoOutcome = "already_settled" | "settled" | "failed" | "pending"

/**
 * Decide what to do with a MoMo collection given the provider status and what
 * we have already persisted. The already-settled short-circuit makes both the
 * client poll and the provider callback idempotent: whichever arrives second is
 * a no-op rather than a double-credit.
 */
export function evaluateMomoOutcome(input: {
  momoStatus: MomoStatus
  attemptStatus: string | null | undefined
  orderStatus: string | null | undefined
}): MomoOutcome {
  if (input.attemptStatus === "succeeded" || input.orderStatus === "paid") return "already_settled"
  if (input.attemptStatus === "failed") return "failed"
  if (input.momoStatus === "SUCCESSFUL") return "settled"
  if (input.momoStatus === "FAILED") return "failed"
  return "pending"
}
