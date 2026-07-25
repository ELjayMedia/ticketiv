import "server-only"

import * as Sentry from "@sentry/nextjs"

import { deliverTicketsForOrder } from "@/lib/notifications/ticket-delivery"
import { evaluateProviderVerification } from "@/lib/payments-math"
import { verifyPaystackTransaction } from "@/lib/payments/paystack-config"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

/**
 * Resale and waitlist checkouts (TICK-339).
 *
 * Unlike the primary flow, these create their `payments` row up front — tagged
 * with `payload.kind` — and settle it later. Completion is only ever performed
 * by `fn_complete_{resale,waitlist}_after_payment_webhook`, which are granted
 * to `service_role` alone, so no browser session can reach them: the buyer-side
 * RPCs that used to be granted to `authenticated` were revoked in
 * 20260725160000_lock_client_callable_completion_rpcs.sql.
 *
 * Two callers reach the completion step, and both must first prove the payment
 * succeeded at the provider:
 *   - the Paystack webhook, after verifying the HMAC signature over the raw body
 *   - the buyer's "complete" action, after pulling the transaction from
 *     Paystack's verify endpoint and matching reference, amount and currency
 */

export type SpecialCheckoutKind = "resale_checkout" | "waitlist_checkout"

const COMPLETION_RPC = {
  resale_checkout: "fn_complete_resale_after_payment_webhook",
  waitlist_checkout: "fn_complete_waitlist_after_payment_webhook",
} as const satisfies Record<SpecialCheckoutKind, string>

interface SpecialCheckoutPayment {
  id: string
  order_id: string
  status: string
  amount_cents: number | null
  currency: string | null
  ext_payment_id: string | null
  payload: Record<string, any> | null
}

function readKind(payment: Pick<SpecialCheckoutPayment, "payload">): SpecialCheckoutKind | null {
  const kind = payment.payload?.kind
  return kind === "resale_checkout" || kind === "waitlist_checkout" ? kind : null
}

/**
 * Run the service-role completion RPC and deliver the resulting tickets. The
 * RPCs are idempotent, so a webhook redelivery racing the buyer's own action
 * converges on one outcome.
 */
async function runCompletion(paymentId: string, kind: SpecialCheckoutKind, orderId: string) {
  const admin = createAdminClient()
  const rpc = COMPLETION_RPC[kind]
  const { data, error } = await admin.rpc(rpc, { p_payment_id: paymentId })

  if (error) {
    // Leave the payment marked succeeded so a retry can re-attempt completion,
    // but surface the failure so the webhook returns non-2xx and Paystack
    // redelivers.
    Sentry.captureException(error, {
      tags: { area: "payment-completion", rpc },
      extra: { orderId, paymentId },
    })
    throw new Error(`Completion failed: ${error.message}`)
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined
  const deliverOrderId = kind === "resale_checkout" ? row?.buyer_order_id : row?.order_id
  if (deliverOrderId) await deliverTicketsForOrder(String(deliverOrderId))

  return { handled: true as const, kind, paymentId, result: data }
}

async function markPaymentSucceeded(paymentId: string, reference: string, payloadPatch: Record<string, unknown>) {
  const admin = createAdminClient()
  const { error } = await admin
    .from("payments")
    .update({ status: "succeeded", ext_payment_id: reference, payload: payloadPatch as Json })
    .eq("id", paymentId)

  if (error) throw new Error(`Unable to update special checkout payment: ${error.message}`)
}

async function findSpecialCheckoutPaymentForOrder(orderId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payments")
    .select("id, order_id, status, amount_cents, currency, ext_payment_id, payload")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .returns<SpecialCheckoutPayment[]>()

  if (error) throw new Error(`Unable to inspect checkout payment: ${error.message}`)
  return (data ?? []).find((row) => readKind(row) !== null) ?? null
}

/**
 * Webhook entry point. The caller has already verified the provider signature
 * over the raw body and matched the amount against the order total.
 *
 * Returns `{ handled: false }` for a normal primary checkout so the caller can
 * fall through to the primary completion path.
 */
export async function completeSpecialCheckoutFromWebhook(
  orderId: string,
  reference: string,
  webhookPayload: Record<string, any>,
) {
  const payment = await findSpecialCheckoutPaymentForOrder(orderId)
  if (!payment) return { handled: false as const }

  const kind = readKind(payment)!
  await markPaymentSucceeded(payment.id, reference, {
    ...(payment.payload ?? {}),
    provider_reference: reference,
    webhook: webhookPayload,
  })

  return runCompletion(payment.id, kind, orderId)
}

export type BuyerCompletionFailure =
  | "not_found"
  | "not_owner"
  | "unverifiable"
  | "not_successful"
  | "mismatch"

export type BuyerCompletionResult =
  | { ok: true; kind: SpecialCheckoutKind; orderId: string; result: unknown }
  | { ok: false; reason: BuyerCompletionFailure }

/**
 * Buyer-initiated completion. Used when the buyer returns from the provider
 * before the webhook has landed, so it must reproduce the webhook's guarantees
 * itself rather than trusting the browser: ownership of the order, then a
 * provider-side verification of the reference, amount and currency.
 *
 * Fails closed — a payment with no provider reference to verify against is
 * never completed here, it waits for the signed webhook.
 */
export async function completeSpecialCheckoutForBuyer(input: {
  paymentId: string
  buyerId: string
  /** Guards against a payment id belonging to a different listing/offer. */
  expectedKind: SpecialCheckoutKind
  /** resale listing id or waitlist offer id, matched against payload. */
  expectedSubjectId: string
}): Promise<BuyerCompletionResult> {
  const admin = createAdminClient()

  const { data: payment, error } = await admin
    .from("payments")
    .select("id, order_id, status, amount_cents, currency, ext_payment_id, payload")
    .eq("id", input.paymentId)
    .maybeSingle<SpecialCheckoutPayment>()

  if (error) throw new Error(`Unable to load payment: ${error.message}`)
  if (!payment) return { ok: false, reason: "not_found" }

  const kind = readKind(payment)
  if (kind !== input.expectedKind) return { ok: false, reason: "not_found" }

  const subjectKey = kind === "resale_checkout" ? "listing_id" : "waitlist_id"
  if (String(payment.payload?.[subjectKey] ?? "") !== input.expectedSubjectId) {
    return { ok: false, reason: "not_found" }
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, buyer_id, total_cents, currency")
    .eq("id", payment.order_id)
    .maybeSingle<{ id: string; buyer_id: string | null; total_cents: number; currency: string }>()

  if (orderError) throw new Error(`Unable to load order: ${orderError.message}`)
  if (!order) return { ok: false, reason: "not_found" }
  if (order.buyer_id !== input.buyerId) return { ok: false, reason: "not_owner" }

  // Already settled by the webhook — re-running the idempotent RPC is how a
  // buyer who clicked before the webhook's completion landed still gets their
  // ticket, without a second provider round-trip.
  if (payment.status === "succeeded") {
    const completion = await runCompletion(payment.id, kind, order.id)
    return { ok: true, kind, orderId: order.id, result: completion.result }
  }

  const reference = payment.ext_payment_id ?? (await findPendingAttemptReference(order.id))
  if (!reference) return { ok: false, reason: "unverifiable" }

  const verified = await verifyPaystackTransaction(reference)
  const decision = evaluateProviderVerification({
    providerStatus: verified.status,
    providerReference: verified.reference,
    providerAmountCents: verified.amountCents,
    providerCurrency: verified.currency,
    expectedReference: reference,
    expectedAmountCents: payment.amount_cents ?? order.total_cents,
    expectedCurrency: payment.currency ?? order.currency,
  })

  if (decision === "not_successful") return { ok: false, reason: "not_successful" }
  if (decision !== "proceed") {
    // A reference/amount/currency mismatch on a payment the buyer owns is not a
    // normal race — record it rather than letting it read as "still pending".
    Sentry.captureMessage("Provider verification mismatch on buyer completion", {
      level: "warning",
      tags: { area: "payment-completion", decision },
      extra: { paymentId: payment.id, orderId: order.id, kind },
    })
    return { ok: false, reason: "mismatch" }
  }

  await markPaymentSucceeded(payment.id, verified.reference, {
    ...(payment.payload ?? {}),
    provider_reference: verified.reference,
    verified_by: "buyer_completion",
    verification: { status: verified.status, amount: verified.amountCents, currency: verified.currency },
  })

  const completion = await runCompletion(payment.id, kind, order.id)
  return { ok: true, kind, orderId: order.id, result: completion.result }
}

async function findPendingAttemptReference(orderId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payment_attempts")
    .select("ext_ref")
    .eq("order_id", orderId)
    .eq("provider", "paystack")
    .not("ext_ref", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ ext_ref: string | null }>()

  if (error) throw new Error(`Unable to load payment attempt: ${error.message}`)
  return data?.ext_ref ?? null
}
