import "server-only"

import crypto, { randomUUID } from "crypto"

import { APP_URL, PAYSTACK_SECRET_KEY } from "@/lib/env"
import { completePaidOrder } from "@/lib/orders"
import { notifyPaymentFailed, notifyPaymentSucceeded, notifyTicketPurchaseSucceeded } from "@/lib/notifications"
import { deliverTicketsForOrder } from "@/lib/notifications/ticket-delivery"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export type PaymentProvider = "deltapay" | "paystack" | "flutterwave" | "manual" | "momo"

type LiveOrder = {
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

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: { authorization_url: string; access_code: string; reference: string }
}

type PaystackSettings = {
  secretKey: string
  webhookSecret?: string | null
  callbackUrl?: string | null
}

export interface CreatePaymentAttemptInput {
  orderId: string
  provider: PaymentProvider
  userId: string
  returnUrl?: string | null
}

export interface CompleteVerifiedPaymentInput {
  orderId: string
  provider: PaymentProvider
  extPaymentId: string
  payload?: Record<string, any>
}

function assertProvider(provider: string): asserts provider is PaymentProvider {
  if (!["deltapay", "paystack", "flutterwave", "manual", "momo"].includes(provider)) throw new Error("Unsupported payment provider")
}

async function getPaystackSettings(): Promise<PaystackSettings> {
  const admin = createAdminClient()
  const { data } = await admin
    .from("payment_provider_settings")
    .select("is_enabled, secret_key, webhook_secret, callback_url")
    .eq("provider", "paystack")
    .maybeSingle()

  const secretKey = data?.is_enabled && data.secret_key ? data.secret_key : PAYSTACK_SECRET_KEY
  if (!secretKey) throw new Error("Missing Paystack secret key")
  return { secretKey, webhookSecret: data?.webhook_secret ?? null, callbackUrl: data?.callback_url ?? null }
}

async function getPendingOrder(orderId: string, userId?: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")

  let query = supabase.from("orders").select("*").eq("id", orderId)
  if (userId) query = query.eq("buyer_id", userId)

  const { data: order, error } = await query.maybeSingle<LiveOrder>()
  if (error) {
    console.error("Failed to load order", error)
    throw new Error("Unable to load order")
  }
  if (!order) throw new Error("Order not found")
  if (order.status !== "pending") throw new Error(`Order is not payable from status: ${order.status}`)

  return { supabase, order }
}

function getBuyerEmail(order: LiveOrder) {
  const email = order.buyer_email ?? order.email
  if (!email) throw new Error("Order is missing buyer email")
  return email
}

async function initializePaystackTransaction(order: LiveOrder, reference: string, returnUrl?: string | null) {
  const settings = await getPaystackSettings()
  // The buyer is sent here by Paystack after the hosted page. The webhook
  // is what actually moves the order to "paid"; this URL just lands them
  // on the confirmation page which polls until the webhook completes.
  const callbackUrl = returnUrl ?? settings.callbackUrl ?? `${APP_URL}/orders/${order.id}/confirmation`

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: { Authorization: `Bearer ${settings.secretKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: getBuyerEmail(order),
      amount: order.total_cents,
      currency: order.currency,
      reference,
      callback_url: callbackUrl,
      metadata: { order_id: order.id, org_id: order.org_id, buyer_id: order.buyer_id },
    }),
  })

  const payload = (await response.json()) as PaystackInitializeResponse
  if (!response.ok || !payload.status || !payload.data?.authorization_url) {
    console.error("Paystack initialization failed", payload)
    throw new Error(payload.message || "Unable to initialize Paystack payment")
  }

  return payload.data
}

export async function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  const settings = await getPaystackSettings().catch(() => null)
  const secretKey = settings?.webhookSecret || settings?.secretKey || PAYSTACK_SECRET_KEY
  if (!secretKey || !signature) return false

  const expected = crypto.createHmac("sha512", secretKey).update(rawBody).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

async function writePaymentLedger(order: LiveOrder, paymentId: string) {
  const admin = createAdminClient()
  const subtotal = order.subtotal_cents ?? order.total_cents
  const platformFee = order.platform_fee_cents ?? 0
  const processorFee = order.processor_fee_cents ?? 0
  const net = order.total_cents - platformFee - processorFee

  const entries = [
    { org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "order_gross", amount_cents: subtotal, currency: order.currency, meta: { source: "payment_completion" } },
    ...(platformFee > 0 ? [{ org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "fee", amount_cents: -platformFee, currency: order.currency, meta: { fee_type: "platform" } }] : []),
    ...(processorFee > 0 ? [{ org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "fee", amount_cents: -processorFee, currency: order.currency, meta: { fee_type: "processor" } }] : []),
    { org_id: order.org_id, order_id: order.id, payment_id: paymentId, type: "payment_net", amount_cents: net, currency: order.currency, meta: { source: "payment_completion" } },
  ]

  const { error } = await admin.from("ledger_entries").insert(entries)
  if (error) {
    console.error("Failed to write payment ledger entries", error)
    throw new Error("Unable to write ledger entries")
  }
}

export async function createPaymentAttempt(input: CreatePaymentAttemptInput) {
  assertProvider(input.provider)
  const { supabase, order } = await getPendingOrder(input.orderId, input.userId)
  const { count, error: countError } = await supabase.from("payment_attempts").select("id", { count: "exact", head: true }).eq("order_id", order.id)

  if (countError) {
    console.error("Failed to count payment attempts", countError)
    throw new Error("Unable to create payment attempt")
  }

  const extRef = `${input.provider}_${order.id}_${randomUUID()}`
  const attemptNo = (count ?? 0) + 1
  const providerPayload = input.provider === "paystack" ? await initializePaystackTransaction(order, extRef, input.returnUrl) : null

  const { data: attempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .insert({
      order_id: order.id,
      provider: input.provider,
      attempt_no: attemptNo,
      status: "pending",
      ext_ref: providerPayload?.reference ?? extRef,
      payload: { return_url: input.returnUrl ?? null, amount_cents: order.total_cents, currency: order.currency, provider: providerPayload },
    })
    .select("*")
    .single()

  if (attemptError || !attempt) {
    console.error("Failed to create payment attempt", attemptError)
    throw new Error("Unable to create payment attempt")
  }

  return {
    order,
    attempt,
    payment: {
      provider: input.provider,
      reference: providerPayload?.reference ?? extRef,
      amountCents: order.total_cents,
      currency: order.currency,
      status: "pending",
      checkoutUrl: providerPayload?.authorization_url ?? null,
      accessCode: providerPayload?.access_code ?? null,
    },
  }
}

export async function completeVerifiedPayment(input: CompleteVerifiedPaymentInput) {
  assertProvider(input.provider)
  const { supabase, order } = await getPendingOrder(input.orderId)

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      order_id: order.id,
      provider: input.provider,
      amount_cents: order.total_cents,
      currency: order.currency,
      ext_payment_id: input.extPaymentId,
      payload: input.payload ?? {},
      status: "succeeded",
      channel: "online",
    })
    .select("*")
    .single()

  if (paymentError || !payment) {
    console.error("Failed to record payment", paymentError)
    throw new Error("Unable to record payment")
  }

  const { error: attemptError } = await supabase
    .from("payment_attempts")
    .update({ status: "succeeded", payment_id: payment.id })
    .eq("order_id", order.id)
    .eq("provider", input.provider)
    .eq("status", "pending")

  if (attemptError) {
    console.error("Failed to mark payment attempt as succeeded", attemptError)
    throw new Error("Unable to update payment attempt")
  }

  await writePaymentLedger(order, payment.id)
  const completed = await completePaidOrder(order.id, input.extPaymentId)

  await Promise.all([
    notifyPaymentSucceeded({ userId: order.buyer_id, orderId: order.id, paymentId: payment.id, amountCents: order.total_cents, currency: order.currency }),
    notifyTicketPurchaseSucceeded({ userId: order.buyer_id, orderId: order.id, orgId: order.org_id, amountCents: order.total_cents, currency: order.currency, ticketCount: completed.items?.length ?? undefined }),
  ])

  // Transactional ticket delivery (email now, WhatsApp stub). Best-effort —
  // never blocks payment completion.
  await deliverTicketsForOrder(order.id)

  return { payment, order: completed.order, items: completed.items }
}

/**
 * Resale and waitlist checkouts create their `payments` row up front (tagged
 * with payload.kind), unlike the primary flow which inserts the payment on
 * success. When a verified webhook arrives for one of these orders we update
 * that existing row to succeeded and hand off to the matching idempotent
 * service-role completion function — never the primary completePaidOrder path.
 *
 * Returns { handled: false } when the order is a normal primary checkout so
 * the caller can fall through.
 */
async function completeProviderCheckoutByKind(orderId: string, reference: string, payload: Record<string, any>) {
  const admin = createAdminClient()

  const { data: payments, error } = await admin
    .from("payments")
    .select("id, status, payload")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[webhook] lookup resale/waitlist payment failed", error)
    return { handled: false as const }
  }

  const payment = (payments ?? []).find((p) => {
    const k = (p.payload as Record<string, any>)?.kind
    return k === "resale_checkout" || k === "waitlist_checkout"
  })
  if (!payment) return { handled: false as const }

  const kind = (payment.payload as Record<string, any>)?.kind as string

  // Mark the existing payment succeeded (idempotent — already-succeeded is fine).
  const mergedPayload = { ...(payment.payload as Record<string, any>), provider_reference: reference, webhook: payload }
  const { error: updateError } = await admin
    .from("payments")
    .update({ status: "succeeded", ext_payment_id: reference, payload: mergedPayload })
    .eq("id", payment.id)

  if (updateError) {
    console.error("[webhook] mark resale/waitlist payment succeeded failed", updateError)
    throw new Error("Unable to update payment")
  }

  const rpc = kind === "resale_checkout" ? "fn_complete_resale_after_payment_webhook" : "fn_complete_waitlist_after_payment_webhook"
  const { data: result, error: rpcError } = await admin.rpc(rpc, { p_payment_id: payment.id })

  if (rpcError) {
    // Leave the payment marked succeeded so a retry can re-attempt completion,
    // but surface the failure so the webhook returns non-2xx and the provider
    // redelivers.
    console.error(`[webhook] ${rpc} failed`, rpcError)
    throw new Error(`Completion failed: ${rpcError.message}`)
  }

  // Deliver the ticket (email now, WhatsApp/SMS-ready). Best-effort and
  // idempotent — safe across webhook redeliveries and the buyer-facing
  // completion action. resale → buyer_order_id, waitlist → order_id.
  const row = Array.isArray(result) ? result[0] : result
  const rowAny = row as Record<string, unknown> | undefined
  const deliverOrderId = kind === "resale_checkout" ? rowAny?.buyer_order_id : rowAny?.order_id
  if (deliverOrderId) await deliverTicketsForOrder(String(deliverOrderId))

  return { handled: true as const, kind, paymentId: payment.id, result }
}

export async function completePaystackPaymentFromWebhook(payload: Record<string, any>) {
  const data = payload?.data ?? {}
  const metadata = data?.metadata ?? {}
  const orderId = String(metadata.order_id ?? "")
  const status = String(data.status ?? "")
  const reference = String(data.reference ?? "")

  if (!orderId) throw new Error("Paystack webhook missing order_id metadata")
  if (!reference) throw new Error("Paystack webhook missing reference")

  if (status !== "success") {
    await failPaymentAttempt(orderId, "paystack", reference, payload)
    return { ok: true, status }
  }

  // TICK-178 — webhook hardening. Look the order up once via service role so we
  // can (1) ack redeliveries for an already-settled order (idempotent no-op,
  // returns 200 so the provider stops retrying) and (2) verify the provider
  // amount matches what we charged before crediting anything.
  const amount = Number(data.amount ?? 0)
  const admin = createAdminClient()
  const { data: orderRow, error: orderLookupError } = await admin
    .from("orders")
    .select("id, status, total_cents")
    .eq("id", orderId)
    .maybeSingle<{ id: string; status: string; total_cents: number }>()

  if (orderLookupError) {
    console.error("[webhook] order lookup failed", orderLookupError)
    throw new Error("Unable to load order")
  }
  if (!orderRow) throw new Error("Order not found")

  // Already settled (paid/refunded/failed) — acknowledge so Paystack stops
  // redelivering instead of throwing "not payable" -> 400 -> infinite retry.
  if (orderRow.status !== "pending") {
    return { ok: true, duplicate: true, status: orderRow.status }
  }

  // Reject tampered/mismatched amounts. data.amount is in minor units (cents),
  // same unit as total_cents. Skip only when the provider omits the amount.
  if (amount && amount !== orderRow.total_cents) {
    console.error("[webhook] amount mismatch", { orderId, amount, expected: orderRow.total_cents })
    throw new Error(`Paystack amount ${amount} does not match order total ${orderRow.total_cents}`)
  }

  // Resale / waitlist orders complete through their dedicated idempotent path.
  const kindResult = await completeProviderCheckoutByKind(orderId, reference, payload)
  if (kindResult.handled) {
    return { ok: true, kind: kindResult.kind, result: kindResult.result }
  }

  return completeVerifiedPayment({ orderId, provider: "paystack", extPaymentId: reference, payload })
}

export async function failPaymentAttempt(orderId: string, provider: PaymentProvider, extRef?: string | null, payload?: Record<string, any>) {
  assertProvider(provider)
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")

  const { data: order } = await supabase.from("orders").select("id, buyer_id").eq("id", orderId).maybeSingle()

  const query = supabase.from("payment_attempts").update({ status: "failed", payload: payload ?? {} }).eq("order_id", orderId).eq("provider", provider).eq("status", "pending")
  if (extRef) query.eq("ext_ref", extRef)
  const { error } = await query

  if (error) {
    console.error("Failed to mark payment attempt as failed", error)
    throw new Error("Unable to update payment attempt")
  }

  await notifyPaymentFailed({ userId: order?.buyer_id ?? null, orderId, provider, reference: extRef })
  return { ok: true }
}
