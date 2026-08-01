import "server-only"

import { randomUUID } from "crypto"
import * as Sentry from "@sentry/nextjs"

import { APP_URL } from "@/lib/env"
import { notifyPaymentFailed } from "@/lib/notifications"
import { assertPaymentProviderAvailableForOrder } from "@/lib/payments/availability"
import {
  createPaymentChannelUnavailableError,
  reportPaymentChannelUnavailable,
} from "@/lib/payments/errors"
import { drainPaymentOutbox } from "@/lib/payments/outbox"
import { getPaystackSettings } from "@/lib/payments/paystack-config"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolvePaymentProvider } from "@/lib/payments/routing"

export type PaymentProvider = "paystack" | "flutterwave" | "manual" | "momo"

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
  if (!["paystack", "flutterwave", "manual", "momo"].includes(provider)) throw new Error("Unsupported payment provider")
}

async function getPendingOrder(orderId: string, userId?: string) {
  // Service role: callers are trusted, post-verification server contexts — the
  // checkout server action (scoped to the buyer via userId below), and the
  // MoMo callback/status routes, which carry no browser session. `orders` has
  // no anon read grant, so the anon/cookie client would find nothing here.
  // Buyer scoping is still enforced explicitly when userId is provided.
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
  // The buyer is sent here by Paystack after the hosted page. The webhook
  // is what actually moves the order to "paid"; this URL just lands them
  // on the confirmation page which polls until the webhook completes.
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
  // Provider selection runs through payment_routing_rules, constrained by any
  // event-level lock: an explicit, known, *permitted* client choice wins;
  // otherwise the active rules decide.
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
  const providerPayload = provider === "paystack" ? await initializePaystackTransaction(order, extRef, input.returnUrl) : null

  const { data: attempt, error: attemptError } = await supabase
    .from("payment_attempts")
    .insert({
      order_id: order.id,
      provider,
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
      provider,
      reference: providerPayload?.reference ?? extRef,
      amountCents: order.total_cents,
      currency: order.currency,
      status: "pending",
      checkoutUrl: providerPayload?.authorization_url ?? null,
      accessCode: providerPayload?.access_code ?? null,
    },
  }
}

/**
 * Complete a payment whose authenticity the caller has already verified
 * (TICK-333).
 *
 * Routes through the same single transactional RPC as the Paystack webhook.
 * This path previously repeated the completion by hand -- payment insert,
 * attempt update, ledger write, then completePaidOrder -- as four separate
 * transactions, so a failure between any two left the order torn in exactly
 * the ways the RPC now makes impossible. MoMo makes that likelier than most:
 * completion arrives from both the callback and status polling, so partial
 * runs interleave.
 *
 * Ticket delivery stays outside the transaction, drained from payment_outbox
 * after it commits.
 */
export async function completeVerifiedPayment(input: CompleteVerifiedPaymentInput) {
  assertProvider(input.provider)
  const { supabase, order } = await getPendingOrder(input.orderId)

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
  // Service role: called from the MoMo callback/status routes, which carry no
  // browser session; payment_attempts has no anon write grant.
  const supabase = createAdminClient()
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
