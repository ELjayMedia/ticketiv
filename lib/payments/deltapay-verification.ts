import "server-only"

import * as Sentry from "@sentry/nextjs"

import { completeVerifiedPayment, failPaymentAttempt } from "@/lib/payments"
import {
  deltaPayAmountToCents,
  verifyDeltaPayHostedSession,
  type DeltaPayVerifiedSession,
} from "@/lib/payments/deltapay"
import { createAdminClient } from "@/lib/supabase/admin"

type DeltaPayAttempt = {
  id: string
  order_id: string
  ext_ref: string | null
  status: string
  payload: Record<string, any> | null
  attempt_no: number
}

type DeltaPayOrder = {
  id: string
  total_cents: number
  currency: string
  status: string
}

function merchantReferenceFor(attempt: DeltaPayAttempt): string | null {
  const value = attempt.payload?.provider?.merchant_reference
  return typeof value === "string" && value ? value : null
}

async function loadAttemptBySession(checkoutSessionId: string): Promise<DeltaPayAttempt> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payment_attempts")
    .select("id, order_id, ext_ref, status, payload, attempt_no")
    .eq("provider", "deltapay")
    .eq("ext_ref", checkoutSessionId)
    .maybeSingle()

  if (error) throw new Error("Unable to load DeltaPay payment attempt")
  if (!data) throw new Error("DeltaPay payment attempt not found")
  return data as DeltaPayAttempt
}

async function loadAttemptByReturn(orderId: string, merchantReference: string): Promise<DeltaPayAttempt> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payment_attempts")
    .select("id, order_id, ext_ref, status, payload, attempt_no")
    .eq("provider", "deltapay")
    .eq("order_id", orderId)
    .order("attempt_no", { ascending: false })
    .limit(10)

  if (error) throw new Error("Unable to load DeltaPay payment attempt")
  const attempt = ((data ?? []) as DeltaPayAttempt[]).find(
    (candidate) => merchantReferenceFor(candidate) === merchantReference,
  )
  if (!attempt) throw new Error("DeltaPay payment attempt not found")
  return attempt
}

async function loadOrder(orderId: string): Promise<DeltaPayOrder> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("orders")
    .select("id, total_cents, currency, status")
    .eq("id", orderId)
    .maybeSingle()

  if (error) throw new Error("Unable to load order for DeltaPay verification")
  if (!data) throw new Error("Order not found for DeltaPay verification")
  return data as DeltaPayOrder
}

async function assertPaidOrderMatchesDeltaPay(orderId: string, checkoutSessionId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("payments")
    .select("provider, ext_payment_id")
    .eq("order_id", orderId)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error("Unable to verify the existing order payment")
  if (!data || data.provider !== "deltapay" || data.ext_payment_id !== checkoutSessionId) {
    throw new Error("Order was already paid using a different payment")
  }
}

function validateVerifiedSession(
  verified: DeltaPayVerifiedSession,
  attempt: DeltaPayAttempt,
  order: DeltaPayOrder,
) {
  const expectedSessionId = attempt.ext_ref
  const expectedMerchantReference = merchantReferenceFor(attempt)

  if (!expectedSessionId || verified.checkout_session_id !== expectedSessionId) {
    throw new Error("DeltaPay checkout session mismatch")
  }
  if (!expectedMerchantReference || verified.merchant_reference !== expectedMerchantReference) {
    throw new Error("DeltaPay merchant reference mismatch")
  }
  if (verified.platform_order_id !== order.id) {
    throw new Error("DeltaPay platform order mismatch")
  }
  if (order.currency.toUpperCase() !== "SZL") {
    throw new Error("DeltaPay order currency mismatch")
  }
  if (deltaPayAmountToCents(verified.amount) !== order.total_cents) {
    throw new Error("DeltaPay amount mismatch")
  }
}

async function verifyAttempt(attempt: DeltaPayAttempt) {
  if (!attempt.ext_ref) throw new Error("DeltaPay attempt is missing its checkout session id")

  const order = await loadOrder(attempt.order_id)
  const verified = await verifyDeltaPayHostedSession(attempt.ext_ref)

  try {
    validateVerifiedSession(verified, attempt, order)
  } catch (error) {
    Sentry.captureException(error, {
      tags: { area: "deltapay-verification", provider: "deltapay" },
      extra: {
        orderId: order.id,
        checkoutSessionId: attempt.ext_ref,
        verificationStatus: verified.status,
      },
    })
    throw error
  }

  if (verified.status === "succeeded") {
    if (order.status === "paid") await assertPaidOrderMatchesDeltaPay(order.id, attempt.ext_ref)
    const completion = await completeVerifiedPayment({
      orderId: order.id,
      provider: "deltapay",
      extPaymentId: attempt.ext_ref,
      payload: verified as unknown as Record<string, any>,
    })
    return { status: verified.status, verified, completion }
  }

  if (["failed", "expired", "cancelled"].includes(verified.status) && attempt.status === "pending") {
    await failPaymentAttempt(order.id, "deltapay", attempt.ext_ref, verified as unknown as Record<string, any>)
  }

  return { status: verified.status, verified, completion: null }
}

export async function verifyDeltaPayBySession(checkoutSessionId: string) {
  const attempt = await loadAttemptBySession(checkoutSessionId)
  return verifyAttempt(attempt)
}

export async function verifyDeltaPayByReturn(orderId: string, merchantReference: string) {
  const attempt = await loadAttemptByReturn(orderId, merchantReference)
  return verifyAttempt(attempt)
}
