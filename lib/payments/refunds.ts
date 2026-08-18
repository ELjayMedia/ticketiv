import "server-only"

import { initiateMomoRefund, reconcileMomoRefund } from "@/lib/payments/momo-refunds"
import { initiatePaystackRefund, reconcilePaystackRefund } from "@/lib/payments/paystack-refunds"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

export type RefundProviderMode = "automatic" | "manual"

export type RefundDispatchResult = {
  ok: true
  refundId: string
  provider: string
  mode: RefundProviderMode
  status: string
  requiresManualCompletion?: boolean
  providerRef?: string | null
  alreadySubmitted?: boolean
  alreadyFinal?: boolean
  needsReconciliation?: boolean
  result?: unknown
}

type RefundContext = {
  id: string
  payment_id: string
  status: string
  provider_ref: string | null
  provider_payload: Json | null
  provider: string
}

function objectPayload(value: Json | null | undefined): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

async function loadRefundContext(refundId: string): Promise<RefundContext> {
  const admin = createAdminClient()
  const { data: refund, error: refundError } = await admin
    .from("refunds")
    .select("id, payment_id, status, provider_ref, provider_payload")
    .eq("id", refundId)
    .maybeSingle()

  if (refundError) throw new Error(`Unable to load refund: ${refundError.message}`)
  if (!refund) throw new Error("Refund not found")

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("provider")
    .eq("id", refund.payment_id)
    .maybeSingle()

  if (paymentError) throw new Error(`Unable to load refund payment provider: ${paymentError.message}`)
  if (!payment?.provider) throw new Error("Refund payment provider is missing")

  return {
    id: refund.id,
    payment_id: refund.payment_id,
    status: refund.status,
    provider_ref: refund.provider_ref,
    provider_payload: refund.provider_payload,
    provider: String(payment.provider).toLowerCase(),
  }
}

async function claimManualRefund(context: RefundContext): Promise<RefundDispatchResult> {
  if (context.status === "processed") {
    return {
      ok: true,
      refundId: context.id,
      provider: context.provider,
      mode: "manual",
      status: context.status,
      providerRef: context.provider_ref,
      alreadyFinal: true,
    }
  }

  if (context.status === "processing") {
    return {
      ok: true,
      refundId: context.id,
      provider: context.provider,
      mode: "manual",
      status: context.status,
      providerRef: context.provider_ref,
      alreadySubmitted: true,
      requiresManualCompletion: true,
    }
  }

  if (context.status !== "requested") {
    throw new Error(`Refund cannot be approved from status: ${context.status}`)
  }

  const admin = createAdminClient()
  const previous = objectPayload(context.provider_payload)
  const manualPayload = {
    ...previous,
    manual_refund: {
      ...objectPayload(previous.manual_refund as Json | null | undefined),
      required: true,
      provider: context.provider,
      approved_at: new Date().toISOString(),
      instructions: "Complete the monetary refund with the provider, then record the provider reference in Ticketiv.",
    },
  }

  const { data: claimed, error } = await admin
    .from("refunds")
    .update({ status: "processing", provider_payload: manualPayload })
    .eq("id", context.id)
    .eq("status", "requested")
    .select("id, status, provider_ref")
    .maybeSingle()

  if (error) throw new Error(`Unable to approve manual refund: ${error.message}`)
  if (!claimed) {
    const raced = await loadRefundContext(context.id)
    if (raced.status === "processing" || raced.status === "processed") {
      return {
        ok: true,
        refundId: raced.id,
        provider: raced.provider,
        mode: "manual",
        status: raced.status,
        providerRef: raced.provider_ref,
        alreadySubmitted: true,
        alreadyFinal: raced.status === "processed",
        requiresManualCompletion: raced.status === "processing",
      }
    }
    throw new Error(`Refund cannot be approved from status: ${raced.status}`)
  }

  return {
    ok: true,
    refundId: context.id,
    provider: context.provider,
    mode: "manual",
    status: claimed.status,
    providerRef: claimed.provider_ref,
    requiresManualCompletion: true,
  }
}

/** Submit an approved refund through the adapter that owns the payment. */
export async function initiateRefund(refundId: string): Promise<RefundDispatchResult> {
  const context = await loadRefundContext(refundId)

  if (context.provider === "paystack") {
    const result = await initiatePaystackRefund(refundId)
    return {
      ...result,
      ok: true,
      refundId,
      provider: context.provider,
      mode: "automatic",
    }
  }

  if (context.provider === "momo") {
    const result = await initiateMomoRefund(refundId)
    return {
      ...result,
      ok: true,
      refundId,
      provider: context.provider,
      mode: "automatic",
    }
  }

  return claimManualRefund(context)
}

/** Reconcile a refund through the adapter that owns its provider state. */
export async function reconcileRefund(refundId: string): Promise<RefundDispatchResult> {
  const context = await loadRefundContext(refundId)

  if (context.provider === "paystack") {
    const result = await reconcilePaystackRefund(refundId)
    return {
      ...result,
      ok: true,
      refundId,
      provider: context.provider,
      mode: "automatic",
    }
  }

  if (context.provider === "momo") {
    const result = await reconcileMomoRefund(refundId)
    return {
      ...result,
      ok: true,
      refundId,
      provider: context.provider,
      mode: "automatic",
    }
  }

  return {
    ok: true,
    refundId,
    provider: context.provider,
    mode: "manual",
    status: context.status,
    providerRef: context.provider_ref,
    requiresManualCompletion: context.status === "processing",
    alreadyFinal: context.status === "processed" || context.status === "failed",
  }
}
