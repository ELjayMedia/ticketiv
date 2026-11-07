import { randomUUID } from "crypto"
import * as Sentry from "@sentry/nextjs"

export type PaymentChannelFailureReason =
  | "missing_configuration"
  | "no_matching_route"
  | "provider_rejected_initialization"
  | "routing_configuration_unavailable"

export class PaymentChannelUnavailableError extends Error {
  readonly code = "payment_channel_unavailable"

  constructor(
    readonly correlationId: string,
    readonly reason: PaymentChannelFailureReason,
    readonly diagnostic: Record<string, unknown> = {},
  ) {
    super(`Payment could not be started. Please contact support with reference ${correlationId}.`)
    this.name = "PaymentChannelUnavailableError"
  }
}

export function createPaymentChannelUnavailableError(
  reason: PaymentChannelFailureReason,
  diagnostic: Record<string, unknown> = {},
) {
  return new PaymentChannelUnavailableError(
    `PAY-${randomUUID().slice(0, 8).toUpperCase()}`,
    reason,
    diagnostic,
  )
}

export function reportPaymentChannelUnavailable(error: PaymentChannelUnavailableError) {
  console.error("[payments] Payment channel unavailable", {
    correlationId: error.correlationId,
    reason: error.reason,
    ...error.diagnostic,
  })
  Sentry.captureException(error, {
    tags: { area: "payment-handoff", reason: error.reason },
    extra: { correlationId: error.correlationId, ...error.diagnostic },
  })
  void saveSupportReference(error)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Row saved so support can search the PAY- code a buyer reads out. */
export function supportReferenceRow(error: PaymentChannelUnavailableError) {
  const diagnostic = error.diagnostic ?? {}
  const pick = (key: string) => {
    const value = diagnostic[key]
    return typeof value === "string" && UUID.test(value) ? value : null
  }
  return {
    ref: error.correlationId,
    order_id: pick("orderId"),
    event_id: pick("eventId"),
    reason: error.reason,
    provider: typeof diagnostic.provider === "string" ? diagnostic.provider : null,
    diagnostic,
  }
}

// Best-effort: the buyer already sees the reference; failing to save it must
// never change what happens at checkout.
async function saveSupportReference(error: PaymentChannelUnavailableError) {
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin")
    const admin = createAdminClient() as unknown as { from: (table: string) => any }
    const { error: insertError } = await admin.from("payment_support_references").insert(supportReferenceRow(error))
    if (insertError) console.error("[payments] could not save support reference", error.correlationId, insertError.message)
  } catch (cause) {
    console.error("[payments] could not save support reference", error.correlationId, cause)
  }
}
