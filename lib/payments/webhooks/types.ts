import type { CheckoutPaymentProvider } from "@/lib/payments/providers/catalog"

/** One authenticated, parsed provider delivery. */
export interface WebhookDelivery {
  /** Provider's id for this event, used to deduplicate redeliveries. */
  eventId: string
  /** Signature header as received, stored with the audit row (null when the provider signs nothing). */
  signature: string | null
  payload: Record<string, unknown>
}

export interface WebhookOutcome {
  /** True when the event reached a final state, so the audit row can be marked processed. */
  done: boolean
  response: Response
}

/**
 * How one payment provider's notifications are handled. The shared runner
 * (runPaymentWebhook) owns receipts, deduplication and error reporting; the
 * adapter only authenticates the request and settles the event.
 *
 * Adapters never trust a delivery's own success claim: they verify a
 * signature over the raw body, or re-query the provider, before settling.
 */
export interface PaymentWebhookAdapter {
  provider: CheckoutPaymentProvider
  /** Whether each delivery gets a deduplicated row in `webhooks`. */
  recordsReceipt: boolean
  /** Authenticate and parse. Return a Response to stop early (bad signature, unknown reference, …). */
  intake(request: Request): Promise<Response | WebhookDelivery>
  /** Settle the event. Throwing makes the runner answer 500 so the provider retries. */
  process(delivery: WebhookDelivery): Promise<WebhookOutcome>
  /** Response body for an unexpected processing failure. */
  failureBody(error: unknown): Record<string, unknown>
}
