import "server-only"

import crypto from "crypto"
import * as Sentry from "@sentry/nextjs"

import { PAYSTACK_SECRET_KEY } from "@/lib/env"
import { notifyPaymentFailed, notifyPaymentSucceeded, notifyTicketPurchaseSucceeded } from "@/lib/notifications"
import { deliverTicketsForOrder } from "@/lib/notifications/ticket-delivery"
import { completePaidOrder } from "@/lib/orders"
import { buildLedgerEntries, evaluatePaystackWebhookOutcome } from "@/lib/payments-math"
import { getPaystackSettings } from "@/lib/payments/paystack-config"
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

async function getOrCreatePrimaryPayment(order: WebhookOrder, reference: string, payload: WebhookPayload) {
  const admin = createAdminClient()
  const { data: existing, error: lookupError } = await admin
    .from("payments")
    .select("id, status")
    .eq("provider", "paystack")
    .eq("ext_payment_id", reference)
    .maybeSingle()

  if (lookupError) throw new Error(`Unable to inspect payment: ${lookupError.message}`)
  if (existing) return existing

  const { data, error } = await admin
    .from("payments")
    .insert({
      order_id: order.id,
      provider: "paystack",
      amount_cents: order.total_cents,
      currency: order.currency,
      ext_payment_id: reference,
      payload,
      status: "succeeded",
      channel: "online",
    })
    .select("id, status")
    .single()

  if (error || !data) throw new Error(`Unable to record payment: ${error?.message ?? "unknown error"}`)
  return data
}

async function ensureLedger(order: WebhookOrder, paymentId: string) {
  const admin = createAdminClient()
  const { count, error: countError } = await admin
    .from("ledger_entries")
    .select("id", { count: "exact", head: true })
    .eq("payment_id", paymentId)

  if (countError) throw new Error(`Unable to inspect ledger: ${countError.message}`)
  if ((count ?? 0) > 0) return

  const { error } = await admin.from("ledger_entries").insert(buildLedgerEntries(order, paymentId))
  if (error) throw new Error(`Unable to write ledger entries: ${error.message}`)
}

async function completePrimaryCheckout(order: WebhookOrder, reference: string, payload: WebhookPayload) {
  const admin = createAdminClient()
  const payment = await getOrCreatePrimaryPayment(order, reference, payload)

  const { error: attemptError } = await admin
    .from("payment_attempts")
    .update({ status: "succeeded", payment_id: payment.id })
    .eq("order_id", order.id)
    .eq("provider", "paystack")
    .eq("status", "pending")

  if (attemptError) throw new Error(`Unable to update payment attempt: ${attemptError.message}`)

  await ensureLedger(order, payment.id)
  const completed = await completePaidOrder(order.id, reference)

  await Promise.all([
    notifyPaymentSucceeded({ userId: order.buyer_id, orderId: order.id, paymentId: payment.id, amountCents: order.total_cents, currency: order.currency }),
    notifyTicketPurchaseSucceeded({ userId: order.buyer_id, orderId: order.id, orgId: order.org_id, amountCents: order.total_cents, currency: order.currency, ticketCount: completed.items?.length ?? undefined }),
  ])
  await deliverTicketsForOrder(order.id)

  return { payment, order: completed.order, items: completed.items }
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
