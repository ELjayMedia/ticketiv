import "server-only"

import { requirePaystackSecretKey } from "@/lib/payments/paystack-config"
import {
  isPaystackRefundEvent,
  mapPaystackRefundEventStatus,
  paystackRefundProviderReference,
  paystackRefundTransactionReference,
} from "@/lib/payments/paystack-refund-core"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

type RefundRow = {
  id: string
  payment_id: string
  amount_cents: number
  currency: string
  status: "requested" | "processing" | "processed" | "failed" | "cancelled"
  provider_ref: string | null
  provider_payload: Json | null
}

type PaymentRow = {
  id: string
  provider: string
  amount_cents: number
  currency: string
  ext_payment_id: string | null
  status: string | null
}

function objectPayload(value: Json | null | undefined): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

async function transitionRefund(
  refund: RefundRow,
  status: "processing" | "processed" | "failed",
  providerRef: string | null,
  providerData: Record<string, any>,
) {
  const admin = createAdminClient()
  const previous = objectPayload(refund.provider_payload)
  const providerPayload = {
    ...previous,
    paystack: providerData,
  }

  const { data, error } = await admin
    .rpc("fn_transition_refund", {
      p_refund_id: refund.id,
      p_new_status: status,
      p_provider_ref: providerRef ?? refund.provider_ref ?? undefined,
      p_provider_payload: providerPayload,
    })
    .single()

  if (error) throw new Error(`Unable to transition refund: ${error.message}`)
  return data
}

async function loadRefund(refundId: string): Promise<RefundRow> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("refunds")
    .select("id, payment_id, amount_cents, currency, status, provider_ref, provider_payload")
    .eq("id", refundId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load refund: ${error.message}`)
  if (!data) throw new Error("Refund not found")
  return data as RefundRow
}

async function loadPayment(paymentId: string): Promise<PaymentRow> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payments")
    .select("id, provider, amount_cents, currency, ext_payment_id, status")
    .eq("id", paymentId)
    .maybeSingle()

  if (error) throw new Error(`Unable to load refund payment: ${error.message}`)
  if (!data) throw new Error("Refund payment not found")
  return data as PaymentRow
}

/**
 * Submit one already-approved Ticketiv refund to Paystack.
 *
 * The row is claimed by requested -> processing before the network call. This
 * deliberately prefers a recoverable "processing without provider_ref" state
 * over accidentally submitting the same monetary refund twice after an
 * uncertain network response.
 */
export async function initiatePaystackRefund(refundId: string) {
  const admin = createAdminClient()

  const { data: claimed, error: claimError } = await admin
    .from("refunds")
    .update({ status: "processing" })
    .eq("id", refundId)
    .eq("status", "requested")
    .select("id, payment_id, amount_cents, currency, status, provider_ref, provider_payload")
    .maybeSingle()

  if (claimError) throw new Error(`Unable to claim refund: ${claimError.message}`)

  if (!claimed) {
    const current = await loadRefund(refundId)
    if (current.status === "processed") {
      return { ok: true, alreadySubmitted: true, status: current.status, providerRef: current.provider_ref }
    }
    if (current.status === "processing") {
      return {
        ok: true,
        alreadySubmitted: true,
        status: current.status,
        providerRef: current.provider_ref,
        needsReconciliation: !current.provider_ref,
      }
    }
    throw new Error(`Refund cannot be submitted from status: ${current.status}`)
  }

  const refund = claimed as RefundRow
  const payment = await loadPayment(refund.payment_id)

  if (payment.provider !== "paystack" || payment.status !== "succeeded" || !payment.ext_payment_id) {
    await transitionRefund(refund, "failed", null, {
      error: "Refund requires a succeeded Paystack payment with a provider reference",
    })
    throw new Error("Refund requires a succeeded Paystack payment with a provider reference")
  }

  if (refund.amount_cents <= 0 || refund.amount_cents > payment.amount_cents) {
    await transitionRefund(refund, "failed", null, {
      error: "Refund amount is outside the original payment amount",
    })
    throw new Error("Refund amount is outside the original payment amount")
  }

  if (refund.currency.toUpperCase() !== payment.currency.toUpperCase()) {
    await transitionRefund(refund, "failed", null, {
      error: "Refund currency does not match the original payment",
    })
    throw new Error("Refund currency does not match the original payment")
  }

  const existingPayload = objectPayload(refund.provider_payload)
  const reason = String(existingPayload.reason ?? "Ticketiv refund").slice(0, 200)
  const secretKey = await requirePaystackSecretKey()

  let response: Response
  try {
    response = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transaction: payment.ext_payment_id,
        amount: refund.amount_cents,
        currency: refund.currency.toUpperCase(),
        customer_note: reason,
        merchant_note: `Ticketiv refund ${refund.id}: ${reason}`.slice(0, 250),
      }),
      cache: "no-store",
    })
  } catch (error) {
    // The request may have reached Paystack even if the client saw a network
    // failure. Keep the claimed row in processing so a retry cannot double-pay.
    throw new Error(
      `Paystack refund submission has an uncertain outcome; reconcile before retrying: ${
        error instanceof Error ? error.message : "network error"
      }`,
    )
  }

  const payload = (await response.json().catch(() => null)) as
    | { status?: boolean; message?: string; data?: Record<string, any> }
    | null

  if (!response.ok || !payload?.status || !payload.data) {
    await transitionRefund(refund, "failed", null, {
      response_status: response.status,
      message: payload?.message ?? "Paystack rejected the refund request",
      response: payload,
    })
    throw new Error(payload?.message ?? "Paystack rejected the refund request")
  }

  const providerRef = paystackRefundProviderReference(payload.data)
  await transitionRefund(refund, "processing", providerRef, {
    ...payload.data,
    transaction_reference:
      paystackRefundTransactionReference(payload.data) ?? payment.ext_payment_id,
    initiation_message: payload.message ?? null,
  })

  return {
    ok: true,
    alreadySubmitted: false,
    status: "processing" as const,
    providerRef,
  }
}

async function findRefundForWebhook(data: Record<string, any>): Promise<RefundRow> {
  const admin = createAdminClient()
  const providerRef = paystackRefundProviderReference(data)

  if (providerRef) {
    const { data: byProvider, error } = await admin
      .from("refunds")
      .select("id, payment_id, amount_cents, currency, status, provider_ref, provider_payload")
      .eq("provider_ref", providerRef)
      .maybeSingle()
    if (error) throw new Error(`Unable to match Paystack refund: ${error.message}`)
    if (byProvider) return byProvider as RefundRow
  }

  const transactionReference = paystackRefundTransactionReference(data)
  if (!transactionReference) throw new Error("Paystack refund webhook missing transaction reference")

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id")
    .eq("provider", "paystack")
    .eq("ext_payment_id", transactionReference)
    .maybeSingle()
  if (paymentError) throw new Error(`Unable to match refund payment: ${paymentError.message}`)
  if (!payment) throw new Error("Paystack refund payment not found")

  let query = admin
    .from("refunds")
    .select("id, payment_id, amount_cents, currency, status, provider_ref, provider_payload")
    .eq("payment_id", payment.id)
    .in("status", ["requested", "processing", "processed", "failed"])

  const amount = Number(data.amount)
  if (Number.isFinite(amount) && amount > 0) query = query.eq("amount_cents", amount)

  const { data: candidates, error } = await query.order("created_at", { ascending: false }).limit(2)
  if (error) throw new Error(`Unable to match Paystack refund: ${error.message}`)
  if (!candidates || candidates.length !== 1) {
    throw new Error(`Paystack refund webhook matched ${candidates?.length ?? 0} local refunds; refusing ambiguous update`)
  }

  return candidates[0] as RefundRow
}

export async function handlePaystackRefundWebhook(payload: Record<string, any>) {
  const eventType = String(payload.event ?? "")
  if (!isPaystackRefundEvent(eventType)) throw new Error("Not a Paystack refund webhook")

  const status = mapPaystackRefundEventStatus(eventType)
  if (!status) throw new Error(`Unsupported Paystack refund event: ${eventType}`)

  const data = (payload.data ?? {}) as Record<string, any>
  const refund = await findRefundForWebhook(data)

  // A processed Ticketiv refund has already triggered ticket invalidation and
  // ledger reversal. Never let a late pending/processing/failed notification
  // move it backward and make a later redelivery look like a fresh completion.
  if (refund.status === "processed") {
    return { ok: true, refundId: refund.id, status: "processed" as const, duplicate: true }
  }
  if (refund.status === "cancelled") {
    throw new Error("Paystack refund webhook matched a cancelled Ticketiv refund")
  }

  const amount = Number(data.amount)
  if (Number.isFinite(amount) && amount > 0 && amount !== refund.amount_cents) {
    throw new Error(`Paystack refund amount ${amount} does not match Ticketiv refund ${refund.amount_cents}`)
  }

  const currency = String(data.currency ?? "").trim()
  if (currency && currency.toUpperCase() !== refund.currency.toUpperCase()) {
    throw new Error(`Paystack refund currency ${currency} does not match Ticketiv refund ${refund.currency}`)
  }

  const providerRef = paystackRefundProviderReference(data) ?? refund.provider_ref
  const result = await transitionRefund(refund, status, providerRef, {
    ...data,
    webhook_event: eventType,
  })

  return { ok: true, refundId: refund.id, status, result }
}
