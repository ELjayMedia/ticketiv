import { randomUUID } from "crypto"

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
}
