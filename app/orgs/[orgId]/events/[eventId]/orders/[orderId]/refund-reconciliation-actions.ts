"use server"

import { revalidatePath } from "next/cache"

import { reconcileRefund } from "@/lib/payments/refunds"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Json } from "@/types/database"

const SUPPORT_ROLES = new Set([
  "admin",
  "organizer",
  "organizer_owner",
  "organizer_admin",
  "finance",
  "finance_manager",
])

const MANUAL_COMPLETION_ROLES = new Set([
  "admin",
  "organizer_owner",
  "organizer_admin",
  "finance",
  "finance_manager",
])

const AUTOMATED_REFUND_PROVIDERS = new Set(["paystack", "momo"])

function objectPayload(value: Json | null | undefined): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

async function requireRefundAccess(
  orgId: string,
  eventId: string,
  orderId: string,
  refundId: string,
  allowedRoles: Set<string>,
) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not authenticated")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!member || !allowedRoles.has(String(member.role))) {
    throw new Error("Forbidden: finance or organizer admin access required")
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) throw new Error("Event not found")

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!order) throw new Error("Order not found")

  const { data: paymentRows } = await supabase
    .from("payments")
    .select("id, provider")
    .eq("order_id", orderId)
  const payments = paymentRows ?? []
  const paymentIds = payments.map((payment) => payment.id)
  if (paymentIds.length === 0) throw new Error("Order has no payment")

  const { data: refund } = await supabase
    .from("refunds")
    .select("id, payment_id, status, provider_ref, provider_payload")
    .eq("id", refundId)
    .in("payment_id", paymentIds)
    .maybeSingle()
  if (!refund) throw new Error("Refund does not belong to this order")

  const payment = payments.find((row) => row.id === refund.payment_id)
  if (!payment?.provider) throw new Error("Refund payment provider is missing")

  return {
    supabase,
    userId: user.id,
    refund,
    provider: String(payment.provider).toLowerCase(),
  }
}

export async function reconcileRefundAction(
  orgId: string,
  eventId: string,
  orderId: string,
  refundId: string,
) {
  await requireRefundAccess(orgId, eventId, orderId, refundId, SUPPORT_ROLES)

  const result = await reconcileRefund(refundId)
  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders/${orderId}`)
  revalidatePath(`/orgs/${orgId}/finance`)
  return result
}

/**
 * Finalise a provider refund that Ticketiv cannot execute itself.
 *
 * The operator must first complete the monetary refund outside Ticketiv and
 * supply the provider's reference plus a resolution note. Only then do we move
 * the refund to processed through fn_transition_refund, which is the existing
 * idempotent path that invalidates tickets and writes the refund ledger entry.
 */
export async function completeManualRefundAction(
  orgId: string,
  eventId: string,
  orderId: string,
  refundId: string,
  providerReference: string,
  completionNote: string,
) {
  const reference = String(providerReference ?? "").trim().slice(0, 200)
  const note = String(completionNote ?? "").trim().slice(0, 1000)
  if (!reference) throw new Error("Provider refund reference is required")
  if (!note) throw new Error("Completion note is required")

  const { supabase, userId, refund, provider } = await requireRefundAccess(
    orgId,
    eventId,
    orderId,
    refundId,
    MANUAL_COMPLETION_ROLES,
  )

  if (AUTOMATED_REFUND_PROVIDERS.has(provider)) {
    throw new Error(`${provider} refunds must be completed from provider-confirmed status, not manually`)
  }
  if (refund.status === "processed") {
    return { ok: true, refundId, status: "processed" as const, alreadyFinal: true }
  }
  if (refund.status !== "processing") {
    throw new Error(`Manual refund cannot be completed from status: ${refund.status}`)
  }

  const previous = objectPayload(refund.provider_payload)
  const completedAt = new Date().toISOString()
  const providerPayload = {
    ...previous,
    manual_refund: {
      ...objectPayload(previous.manual_refund as Json | null | undefined),
      required: false,
      completed: true,
      provider,
      provider_reference: reference,
      completion_note: note,
      completed_by: userId,
      completed_at: completedAt,
    },
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .rpc("fn_transition_refund", {
      p_refund_id: refundId,
      p_new_status: "processed",
      p_provider_ref: reference,
      p_provider_payload: providerPayload,
    })
    .single()
  if (error) throw new Error(`Unable to complete manual refund: ${error.message}`)

  const { error: auditError } = await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: userId,
    table_name: "refunds",
    record_id: refundId,
    action: "other",
    changes: {
      event_type: "manual_refund_completed",
      refund_id: refundId,
      order_id: orderId,
      event_id: eventId,
      provider,
      provider_reference: reference,
      completion_note: note,
      completed_at: completedAt,
    },
  })
  if (auditError) {
    throw new Error(`Refund completed but audit logging failed: ${auditError.message}`)
  }

  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders/${orderId}`)
  revalidatePath(`/orgs/${orgId}/finance`)
  return { ok: true, refundId, status: "processed" as const, alreadyFinal: false, result: data }
}
