import "server-only"

import crypto from "crypto"
import * as Sentry from "@sentry/nextjs"

import { PAYSTACK_SECRET_KEY } from "@/lib/env"
import { notifyPaymentFailed } from "@/lib/notifications"
import { evaluatePaystackWebhookOutcome } from "@/lib/payments-math"
import { getPaystackSettings } from "@/lib/payments/paystack-config"
import { drainPaymentOutbox } from "@/lib/payments/outbox"
import { completeSpecialCheckoutFromWebhook } from "@/lib/payments/special-checkout"
import { createAdminClient } from "@/lib/supabase/admin"

interface WebhookOrder {
  id: string
  org_id: string
  buyer_id: string
  total_cents: number
  currency: string
  status: "pending" | "paid" | "failed" | "refunded"
  email?: string | null
  buyer_email?: string | null
  subtotal_cents?: number | null
  platform_fee_cents?: number | null
  processor_fee_cents?: number | null
}

type WebhookPayload = Record<string, any>

export async function verifyTrustedPaystackSignature(rawBody: string, signature: string | null) {
  const secret = await getPaystackSettings()
    .then((settings) => settings.webhookSecret)
    .catch(() => PAYSTACK_SECRET_KEY || null)
  if (!secret || !signature || !/^[0-9a-f]{128}$/i.test(signature)) return false

  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex")
  const expectedBuffer = Buffer.from(expected, "hex")
  const signatureBuffer = Buffer.from(signature, "hex")
  if (expectedBuffer.length !== signatureBuffer.length) return false

  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
}

async function loadOrder(orderId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<WebhookOrder>()

  if (error) throw new Error(`Unable to load order: ${error.message}`)
  if (!data) throw new Error("Order not found")
  return data
}

async function failAttempt(order: WebhookOrder, reference: string, payload: WebhookPayload) {
  const admin = createAdminClient()
  const { error } = await admin
    .from("payment_attempts")
    .update({ status: "failed", payload })
    .eq("order_id", order.id)
    .eq("provider", "paystack")
    .eq("status", "pending")
    .eq("ext_ref", reference)

  if (error) throw new Error(`Unable to fail payment attempt: ${error.message}`)
  await notifyPaymentFailed({ userId: order.buyer_id, orderId: order.id, provider: "paystack", reference })
}

/**
 * Complete a verified primary checkout (TICK-333).
 *
 * The payment row, attempt bookkeeping, settlement ledger, ticket issuance,
 * order status and in-app notifications all happen inside
 * fn_complete_order_payment, in one transaction. Previously each was its own
 * round trip, so a crash between any two left the money path in a state no
 * code expected -- most sharply, items issued under an order still marked
 * pending, which the retry then refused to touch.
 *
 * Ticket delivery is the one effect that cannot be transactional. The RPC
 * records the intent to send into payment_outbox in the same commit, and it is
 * drained here, after the transaction has committed.
 */
async function completePrimaryCheckout(order: WebhookOrder, reference: string, payload: WebhookPayload) {
  const admin = createAdminClient()

  const { data, error } = await admin
    .rpc("fn_complete_order_payment", {
      p_order_id: order.id,
      p_provider: "paystack",
      p_ext_payment_id: reference,
      p_amount_cents: order.total_cents,
      p_currency: order.currency,
      p_payload: payload,
    })
    .maybeSingle<{
      completed_order_id: string
      completed_payment_id: string | null
      already_completed: boolean
      issued_item_count: number
    }>()

  if (error) throw new Error(`Unable to complete payment: ${error.message}`)
  if (!data) throw new Error("Payment completion returned no result")

  // Drained even on the already-completed path: a redelivery is exactly when
  // an entry left behind by an earlier failed send needs another attempt.
  await drainPaymentOutbox()

  return {
    paymentId: data.completed_payment_id,
    orderId: data.completed_order_id,
    alreadyCompleted: data.already_completed,
    issuedItemCount: data.issued_item_count,
  }
}

export async function completeTrustedPaystackWebhook(payload: WebhookPayload) {
  const data = payload.data ?? {}
  const metadata = data.metadata ?? {}
  const orderId = String(metadata.order_id ?? "")
  const status = String(data.status ?? "")
  const reference = String(data.reference ?? "")

  if (!orderId) throw new Error("Paystack webhook missing order_id metadata")
  if (!reference) throw new Error("Paystack webhook missing reference")

  const order = await loadOrder(orderId)
  if (status !== "success") {
    await failAttempt(order, reference, payload)
    return { ok: true, status }
  }

  const amount = Number(data.amount ?? 0)
  const outcome = evaluatePaystackWebhookOutcome({
    status,
    orderStatus: order.status,
    orderTotalCents: order.total_cents,
    amount,
  })

  if (outcome === "duplicate") return { ok: true, duplicate: true, status: order.status }
  if (outcome === "amount_mismatch") {
    throw new Error(`Paystack amount ${amount} does not match order total ${order.total_cents}`)
  }

  try {
    const special = await completeSpecialCheckoutFromWebhook(orderId, reference, payload)
    if (special.handled) return { ok: true, kind: special.kind, result: special.result }
    return await completePrimaryCheckout(order, reference, payload)
  } catch (error) {
    Sentry.captureException(error, { tags: { area: "paystack-completion" }, extra: { orderId, reference } })
    throw error
  }
}
