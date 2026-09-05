import "server-only"

import { randomUUID } from "crypto"
import * as Sentry from "@sentry/nextjs"

import { APP_URL } from "@/lib/env"
import { notifyPaymentFailed } from "@/lib/notifications"
import { assertPaymentProviderAvailableForOrder } from "@/lib/payments/availability"
import { createDeltaPayHostedSession } from "@/lib/payments/deltapay"
import {
  createPaymentChannelUnavailableError,
  reportPaymentChannelUnavailable,
} from "@/lib/payments/errors"
import { drainPaymentOutbox } from "@/lib/payments/outbox"
import { getPaystackSettings } from "@/lib/payments/paystack-config"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolvePaymentProvider } from "@/lib/payments/routing"

export type PaymentProvider = "paystack" | "manual" | "momo" | "deltapay"

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
  code?: string
  type?: string
}

export interface CreatePaymentAttemptInput {
  orderId: string
  /** Client preference. When omitted/unknown, payment_routing_rules decides. */
  provider?: PaymentProvider | string | null
  userId: string
  returnUrl?: string | null
  /** Optional ISO country code to match against routing rules. */
  countryCode?: string | null
}

export interface CompleteVerifiedPaymentInput {
  orderId: string
  provider: PaymentProvider
  extPaymentId: string
  payload?: Record<string, any>
}

function assertProvider(provider: string): asserts provider is PaymentProvider {
  if (!["paystack", "manual", "momo", "deltapay"].includes(provider)) {
    throw new Error("Unsupported payment provider")
  }
}

async function loadOrder(orderId: string, userId?: string) {
  const supabase = createAdminClient()
  if (!supabase) throw new Error("Supabase is not configured")

  let query = supabase.from("orders").select("*").eq("id", orderId)
  if (userId) query = query.eq("buyer_id", userId)

  const { data: order, error } = await query.maybeSingle<LiveOrder>()
  if (error) {
    console.error("Failed to load order", error)
    throw new Error("Unable to load order")
  }
  if (!order) throw new Error("Order not found")
  return { supabase, order }
}

async function getPendingOrder(orderId: string, userId?: string) {
  const loaded = await loadOrder(orderId, userId)
  if (loaded.order.status !== "pending") {
    throw new Error(`Order is not payable from status: ${loaded.order.status}`)
  }
  return loaded
}

async function getCompletableOrder(orderId: string) {
  const loaded = await loadOrder(orderId)
  // `fn_complete_order_payment` is idempotent and can report an already-paid
  // order. Let duplicate verified callbacks reach that RPC instead of rejecting
  // them before the transaction can perform its duplicate check.
  if (loaded.order.status !== "pending" && loaded.order.status !== "paid") {
    throw new Error(`Order cannot accept payment completion from status: ${loaded.order.status}`)
  }
  return loaded
}

function getBuyerEmail(order: LiveOrder) {
  const email = order.buyer_email ?? order.email
  if (!email) throw new Error("Order is missing buyer email")
  return email
}

async function initializePaystackTransaction(order: LiveOrder, reference: string, returnUrl?: string | null) {
  const settings = await getPaystackSettings()
  if (!settings.secretKey) {
    const error = createPaymentChannelUnavailableError("missing_configuration", {
      provider: "paystack",
      orderId: order.id,
      currency: order.currency,
      missing: "secret_key",
    })
    reportPaymentChannelUnavailable(error)
    throw error
  }
  const callbackUrl = returnUrl ?? settings.callbackUrl ?? `${APP_URL}/orders/${order.id}/confirmation`

  let response: Response
  try {
    response = await fetch("https://api.paystack.co/transaction/initialize", {
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
  } catch {
    const error = createPaymentChannelUnavailableError("provider_rejected_initialization", {
      provider: "paystack",
      orderId: order.id,
      currency: order.currency,
      providerMessage: "Provider request failed",
    })
    reportPaymentChannelUnavailable(error)
    throw error
  }

  const payload = (await response.json().catch(() => ({
    status: false,
    message: "Provider returned an invalid response",
  }))) as PaystackInitializeResponse
  if (!response.ok || !payload.status || !payload.data?.authorization_url) {
    const error = createPaymentChannelUnavailableError("provider_rejected_initialization", {
      provider: "paystack",
      orderId: order.id,
      currency: order.currency,
      httpStatus: response.status,
      providerCode: payload.code ?? null,
      providerType: payload.type ?? null,
      providerMessage: payload.message || "Unable to initialize Paystack payment",
    })
    reportPaymentChannelUnavailable(error)
    Sentry.captureMessage("Payment provider rejected initialization", {
      level: "error",
      tags: { area: "payment-initialization", provider: "paystack" },
      extra: { correlationId: error.correlationId, orderId: order.id, currency: order.currency },
    })
    throw error
  }

  return payload.data
}

async function initializeDeltaPayTransaction(
  order: LiveOrder,
  merchantReference: string,
  returnUrl?: string | null,
) {
  if (order.currency.toUpperCase() !== "SZL") {
    throw createPaymentChannelUnavailableError("provider_rejected_initialization", {
      provider: "deltapay",
      orderId: order.id,
      currency: order.currency,
      providerMessage: "DeltaPay Hosted Checkout requires SZL",
    })
  }

  const finalReturnUrl = returnUrl ?? `${APP_URL}/orders/${order.id}/confirmation`
  const verifyReturnUrl = new URL("/api/payments/deltapay/return", APP_URL)
  verifyReturnUrl.searchParams.set("order_id", order.id)
  verifyReturnUrl.searchParams.set("merchant_reference", merchantReference)

  try {
    const session = await createDeltaPayHostedSession({
      amountCents: order.total_cents,
      merchantReference,
      platformOrderId: order.id,
      returnUrl: verifyReturnUrl.toString(),
      callbackUrl: new URL("/api/payments/deltapay/callback", APP_URL).toString(),
      displayDescription: `Ticketiv order ${order.id}`,
      metadata: JSON.stringify({ order_id: order.id, org_id: order.org_id, buyer_id: order.buyer_id }),
    })
    return { ...session, merchant_reference: merchantReference, final_return_url: finalReturnUrl }
  } catch (cause) {
    const error = createPaymentChannelUnavailableError("provider_rejected_initialization", {
      provider: "deltapay",
      orderId: order.id,
      currency: order.currency,
      providerMessage: cause instanceof Error ? cause.message : "Unable to initialize DeltaPay payment",
    })
    reportPaymentChannelUnavailable(error)
    Sentry.captureException(cause, {
      tags: { area: "payment-initialization", provider: "deltapay" },
      extra: { correlationId: error.correlationId, orderId: order.id, currency: order.currency },
    })
    throw error
  }
}

async function getOrderAllowedProviders(orderId: string): Promise<string[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("order_items")
    .select("ticket_types(events(id, payment_providers))")
    .eq("order_id", orderId)

  if (error || !data) return []

  const lockByEvent = new Map<string, string[]>()
  for (const row of data as any[]) {
    const ev = row?.ticket_types?.events
    if (ev?.id && Array.isArray(ev.payment_providers) && ev.payment_providers.length > 0) {
      lockByEvent.set(ev.id, ev.payment_providers.map(String))
    }
  }

  const locks = [...lockByEvent.values()]
  if (locks.length === 0) return []

  let allowed = locks[0]
  for (const lock of locks.slice(1)) allowed = allowed.filter((p) => lock.includes(p))
  if (allowed.length === 0) {
    throw new Error("This order's events have no payment provider in common")
  }
  return allowed
}

export async function createPaymentAttempt(input: CreatePaymentAttemptInput) {
  const { supabase, order } = await getPendingOrder(input.orderId, input.userId)
  const allowedProviders = await getOrderAllowedProviders(order.id)
  const provider = await resolvePaymentProvider({
    currency: order.currency,
    countryCode: input.countryCode,
    requested: input.provider,
    allowedProviders,
  })
  assertProvider(provider)
  await assertPaymentProviderAvailableForOrder(order.id, provider)
  const { count, error: countError } = await supabase.from("payment_attempts").select("id", { count: "exact", head: true }).eq("order_id", order.id)

  if (countError) {
    console.error("Failed to count payment attempts", countError)
    throw new Error("Unable to create payment attempt")
  }

  const extRef = `${provider}_${order.id}_${randomUUID()}`
  const attemptNo = (count ?? 0) + 1
  const paystackPayload = provider === "paystack"
    ? await initializePaystackTransaction(order, extRef, input.returnUrl)
    : null
  const deltaPayPayload = provider === "deltapay"
    ? await initializeDeltaPayTransaction(order, extRef, input.returnUrl)
    : null
  const providerPayload = paystackPayload ?? deltaPayPayload
  const providerReference = paystackPayload?.reference ?? deltaPayPayload?.checkout_session_id ?? extRef
  const checkoutUrl = paystackPayload?.authorization_url ?? deltaPayPayload?.checkout_url ?? null
  const accessCode = paystackPayload?.access_code ?? null

  const { data: attempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .insert({
      order_id: order.id,
      provider,
      attempt_no: attemptNo,
      status: "pending",
      ext_ref: providerReference,
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
      provider,
      reference: providerReference,
      amountCents: order.total_cents,
      currency: order.currency,
      status: "pending",
      checkoutUrl,
      accessCode,
    },
  }
}

/**
 * Complete a payment whose authenticity the caller has already verified.
 * The database RPC is the single atomic completion path and is idempotent.
 */
export async function completeVerifiedPayment(input: CompleteVerifiedPaymentInput) {
  assertProvider(input.provider)
  const { supabase, order } = await getCompletableOrder(input.orderId)

  const { data, error } = await supabase
    .rpc("fn_complete_order_payment", {
      p_order_id: order.id,
      p_provider: input.provider,
      p_ext_payment_id: input.extPaymentId,
      p_amount_cents: order.total_cents,
      p_currency: order.currency,
      p_payload: input.payload ?? {},
    })
    .maybeSingle<{
      completed_order_id: string
      completed_payment_id: string | null
      already_completed: boolean
      issued_item_count: number
    }>()

  if (error) {
    console.error("Failed to complete verified payment", error)
    throw new Error(`Unable to complete payment: ${error.message}`)
  }
  if (!data) throw new Error("Payment completion returned no result")

  await drainPaymentOutbox()

  return {
    paymentId: data.completed_payment_id,
    orderId: data.completed_order_id,
    alreadyCompleted: data.already_completed,
    issuedItemCount: data.issued_item_count,
  }
}

export async function failPaymentAttempt(orderId: string, provider: PaymentProvider, extRef?: string | null, payload?: Record<string, any>) {
  assertProvider(provider)
  const supabase = createAdminClient()
  if (!supabase) throw new Error("Supabase is not configured")

  const { data: order } = await supabase.from("orders").select("id, buyer_id").eq("id", orderId).maybeSingle()

  let query = supabase.from("payment_attempts").update({ status: "failed", payload: payload ?? {} }).eq("order_id", orderId).eq("provider", provider).eq("status", "pending")
  if (extRef) query = query.eq("ext_ref", extRef)
  const { error } = await query

  if (error) {
    console.error("Failed to mark payment attempt as failed", error)
    throw new Error("Unable to update payment attempt")
  }

  await notifyPaymentFailed({ userId: order?.buyer_id ?? null, orderId, provider, reference: extRef })
  return { ok: true }
}
