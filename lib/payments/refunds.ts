import "server-only"

import { initiatePaystackRefund, reconcilePaystackRefund } from "@/lib/payments/paystack-refunds"
import { createAdminClient } from "@/lib/supabase/admin"

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
  provider: string
}

async function loadRefundContext(refundId: string): Promise<RefundContext> {
  const admin = createAdminClient()
  const { data: refund, error: refundError } = await admin
    .from("refunds")
    .select("id, payment_id, status, provider_ref")
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
    provider: String(payment.provider).toLowerCase(),
  }
}

/**
 * Submit an approved refund through the provider-specific adapter.
 *
 * Paystack is automated today. Other providers intentionally remain in the
 * requested state until a provider-specific monetary refund is confirmed. This
 * lets Ticketiv accept and track refund requests for every payment provider
 * without incorrectly invalidating tickets or reversing ledgers before money
 * has actually moved.
 */
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

  return {
    ok: true,
    refundId,
    provider: context.provider,
    mode: "manual",
    status: context.status,
    providerRef: context.provider_ref,
    requiresManualCompletion: true,
  }
}

/**
 * Reconcile a refund through the adapter that owns its provider state.
 * Providers without an automated adapter return a manual-completion signal
 * rather than being sent to Paystack by mistake.
 */
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

  return {
    ok: true,
    refundId,
    provider: context.provider,
    mode: "manual",
    status: context.status,
    providerRef: context.provider_ref,
    requiresManualCompletion: true,
  }
}
