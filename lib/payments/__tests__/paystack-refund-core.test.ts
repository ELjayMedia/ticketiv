import { describe, expect, it } from "vitest"

import {
  isPaystackRefundEvent,
  mapPaystackRefundEventStatus,
  mapPaystackRefundStatus,
  paystackRefundProviderReference,
  paystackRefundTransactionReference,
  paystackRefundWebhookEventId,
} from "@/lib/payments/paystack-refund-core"

describe("Paystack refund lifecycle helpers", () => {
  it.each([
    ["refund.pending", "processing"],
    ["refund.processing", "processing"],
    ["refund.needs-attention", "processing"],
    ["refund.processed", "processed"],
    ["refund.failed", "failed"],
  ] as const)("maps %s to %s", (event, expected) => {
    expect(isPaystackRefundEvent(event)).toBe(true)
    expect(mapPaystackRefundEventStatus(event)).toBe(expected)
  })

  it.each([
    ["pending", "processing"],
    ["processing", "processing"],
    ["needs-attention", "processing"],
    ["processed", "processed"],
    ["failed", "failed"],
  ] as const)("maps provider status %s to %s", (status, expected) => {
    expect(mapPaystackRefundStatus(status)).toBe(expected)
  })

  it("does not treat transaction events as refunds", () => {
    expect(isPaystackRefundEvent("charge.success")).toBe(false)
    expect(mapPaystackRefundEventStatus("charge.success")).toBeNull()
    expect(mapPaystackRefundStatus("success")).toBeNull()
  })

  it("extracts transaction and refund references from common Paystack shapes", () => {
    expect(
      paystackRefundTransactionReference({
        transaction_reference: "paystack_order_attempt",
      }),
    ).toBe("paystack_order_attempt")

    expect(
      paystackRefundTransactionReference({
        transaction: { reference: "nested-reference" },
      }),
    ).toBe("nested-reference")

    expect(paystackRefundProviderReference({ id: 91 })).toBe("91")
  })

  it("keeps lifecycle webhook audit ids distinct for the same refund", () => {
    const base = { data: { id: 91, transaction_reference: "paystack_order_attempt" } }
    expect(paystackRefundWebhookEventId({ ...base, event: "refund.pending" })).toBe(
      "refund.pending:91",
    )
    expect(paystackRefundWebhookEventId({ ...base, event: "refund.processed" })).toBe(
      "refund.processed:91",
    )
  })
})
