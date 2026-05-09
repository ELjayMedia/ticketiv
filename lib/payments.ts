import "server-only"

import crypto, { randomUUID } from "crypto"

import { APP_URL, PAYSTACK_SECRET_KEY } from "@/lib/env"
import { completePaidOrder } from "@/lib/orders"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export type PaymentProvider = "deltapay" | "paystack" | "flutterwave" | "manual"

type LiveOrder = {
  id: string
  org_id: string
  buyer_id: string
  total_cents: number
  currency: string
  status: "pending" | "paid" | "failed" | "refunded"
  email?: string | null
  buyer_email?: string | null
}

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
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
  if (!["deltapay", "paystack", "flutterwave", "manual"].includes(provider)) {
    throw new Error("Unsupported payment provider")
  }
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

function toPaystackAmount(order: LiveOrder) {
  // Ticketiv stores minor units in *_cents columns. Paystack also expects the lowest currency unit.
  return order.total_cents
}

async function initializePaystackTransaction(order: LiveOrder, reference: string, returnUrl?: string | null) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("Missing PAYSTACK_SECRET_KEY")
  }

  const callbackUrl = returnUrl ?? `${APP_URL}/orders/${order.id}`

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: getBuyerEmail(order),
      amount: toPaystackAmount(order),
      currency: order.currency,
      reference,
      callback_url: callbackUrl,
      metadata: {
        order_id: order.id,
        org_id: order.org_id,
        buyer_id: order.buyer_id,
      },
    }),
  })

  const payload = (await response.json()) as PaystackInitializeResponse

  if (!response.ok || !payload.status || !payload.data?.authorization_url) {
    console.error("Paystack initialization failed", payload)
    throw new Error(payload.message || "Unable to initialize Paystack payment")
  }

  return payload.data
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string | null) {
  if (!PAYSTACK_SECRET_KEY) return false
  if (!signature) return false

  const expected = crypto.createHmac("sha512", PAYSTACK_SECRET_KEY).update(rawBody).digest("hex")
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

export async function createPaymentAttempt(input: CreatePaymentAttemptInput) {
  assertProvider(input.provider)

  const { supabase, order } = await getPendingOrder(input.orderId, input.userId)

  const { count, error: countError } = await supabase
    .from("payment_attempts")
    .select("id", { count: "exact", head: true })
    .eq("order_id", order.id)

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
      payload: {
        return_url: input.returnUrl ?? null,
        amount_cents: order.total_cents,
        currency: order.currency,
        provider: providerPayload,
      },
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

  const completed = await completePaidOrder(order.id, input.extPaymentId)

  return {
    payment,
    order: completed.order,
    items: completed.items,
  }
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

  return completeVerifiedPayment({
    orderId,
    provider: "paystack",
    extPaymentId: reference,
    payload,
  })
}

export async function failPaymentAttempt(orderId: string, provider: PaymentProvider, extRef?: string | null, payload?: Record<string, any>) {
  assertProvider(provider)

  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")

  const query = supabase
    .from("payment_attempts")
    .update({
      status: "failed",
      payload: payload ?? {},
    })
    .eq("order_id", orderId)
    .eq("provider", provider)
    .eq("status", "pending")

  if (extRef) query.eq("ext_ref", extRef)

  const { error } = await query

  if (error) {
    console.error("Failed to mark payment attempt as failed", error)
    throw new Error("Unable to update payment attempt")
  }

  return { ok: true }
}
