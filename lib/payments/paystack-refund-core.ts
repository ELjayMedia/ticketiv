export type RefundWebhookStatus = "processing" | "processed" | "failed"

export function isPaystackRefundEvent(eventType: unknown): boolean {
  return typeof eventType === "string" && eventType.startsWith("refund.")
}

export function mapPaystackRefundEventStatus(eventType: unknown): RefundWebhookStatus | null {
  switch (eventType) {
    case "refund.pending":
    case "refund.processing":
    case "refund.needs-attention":
      return "processing"
    case "refund.processed":
      return "processed"
    case "refund.failed":
      return "failed"
    default:
      return null
  }
}

export function paystackRefundTransactionReference(data: Record<string, any>): string | null {
  const value =
    data.transaction_reference ??
    data.transaction?.reference ??
    data.transaction?.reference_code ??
    null
  if (value === null || value === undefined) return null
  const reference = String(value).trim()
  return reference || null
}

export function paystackRefundProviderReference(data: Record<string, any>): string | null {
  const value = data.id ?? data.refund_reference ?? null
  if (value === null || value === undefined) return null
  const reference = String(value).trim()
  return reference || null
}

/**
 * Refund lifecycle notifications can reuse the same Paystack refund id across
 * pending -> processing -> processed. Prefixing with the event type keeps the
 * webhook audit idempotent per state without swallowing later state changes.
 */
export function paystackRefundWebhookEventId(payload: Record<string, any>): string | null {
  const eventType = String(payload.event ?? "").trim()
  if (!isPaystackRefundEvent(eventType)) return null

  const data = (payload.data ?? {}) as Record<string, any>
  const identity =
    paystackRefundProviderReference(data) ??
    paystackRefundTransactionReference(data)
  if (!identity) return null
  return `${eventType}:${identity}`
}
