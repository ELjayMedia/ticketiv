"use server"

import { revalidatePath } from "next/cache"
import { initiateRefund } from "@/lib/payments/refunds"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const SUPPORT_ROLES = new Set([
  "admin",
  "organizer",
  "organizer_owner",
  "organizer_admin",
  "finance",
  "finance_manager",
])

async function requireEventSupportAccess(orgId: string, eventId: string) {
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

  if (!member || !SUPPORT_ROLES.has(String(member.role))) {
    throw new Error("Forbidden: finance or organizer admin access required")
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) throw new Error("Event not found")

  return { supabase, userId: user.id }
}

export async function initiateRefundAction(
  orgId: string,
  eventId: string,
  orderItemId: string,
  amountCents: number,
  reason: string,
) {
  const { supabase, userId } = await requireEventSupportAccess(orgId, eventId)
  const normalizedReason = reason.trim()
  if (!normalizedReason) throw new Error("Refund reason is required")
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error("Refund amount must be greater than zero")
  }

  const { data: item } = await supabase
    .from("order_items")
    .select("id, order_id, status, ticket_type_id, ticket_types!inner(event_id, price_cents)")
    .eq("id", orderItemId)
    .maybeSingle()

  if (!item) throw new Error("Order item not found")
  if ((item.ticket_types as any)?.event_id !== eventId) throw new Error("Order item not in this event")
  if (!["issued", "checked_in"].includes(item.status)) {
    throw new Error(`Cannot refund item with status: ${item.status}`)
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, org_id, currency, total_cents")
    .eq("id", item.order_id)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!order) throw new Error("Order does not belong to this organization")

  const { data: payment } = await supabase
    .from("payments")
    .select("id, provider, amount_cents, currency")
    .eq("order_id", order.id)
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!payment) throw new Error("No successful payment found for this order")

  const { data: existingRefunds } = await supabase
    .from("refunds")
    .select("amount_cents, status")
    .eq("payment_id", payment.id)
    .in("status", ["requested", "processing", "processed"])

  const alreadyRequested = (existingRefunds ?? []).reduce(
    (sum, refund) => sum + Math.max(0, refund.amount_cents ?? 0),
    0,
  )
  const remainingRefundable = Math.max(0, (payment.amount_cents ?? 0) - alreadyRequested)
  if (amountCents > remainingRefundable) {
    throw new Error(
      `Refund exceeds the remaining refundable amount of ${payment.currency ?? order.currency} ${(remainingRefundable / 100).toFixed(2)}`,
    )
  }

  const itemFaceValue = Number((item.ticket_types as any)?.price_cents ?? 0)
  if (itemFaceValue > 0 && amountCents > itemFaceValue) {
    throw new Error(`Refund cannot exceed this ticket's face value of ${(itemFaceValue / 100).toFixed(2)}`)
  }

  const currency = payment.currency ?? order.currency ?? "SZL"
  const { data: refund, error } = await supabase
    .from("refunds")
    .insert({
      payment_id: payment.id,
      amount_cents: amountCents,
      currency,
      type: amountCents === payment.amount_cents ? "full" : "partial",
      status: "requested",
      initiated_by: userId,
      provider_payload: {
        source: "organizer",
        payment_provider: payment.provider,
        reason: normalizedReason,
        items: [
          {
            order_item_id: orderItemId,
            amount_cents: amountCents,
            currency,
          },
        ],
      },
    })
    .select("id")
    .single()
  if (error) throw new Error(error.message)

  const { error: auditError } = await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: userId,
    table_name: "refunds",
    record_id: refund.id,
    action: "other",
    changes: {
      event_type: "refund_requested",
      refund_id: refund.id,
      order_id: order.id,
      order_item_id: orderItemId,
      amount_cents: amountCents,
      currency,
      provider: payment.provider,
      reason: normalizedReason,
    },
  })
  if (auditError) throw new Error(`Refund created but audit logging failed: ${auditError.message}`)

  const provider = await initiateRefund(refund.id)

  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: userId,
    table_name: "refunds",
    record_id: refund.id,
    action: "other",
    changes: {
      event_type: "refund_submission_started",
      refund_id: refund.id,
      order_id: order.id,
      event_id: eventId,
      provider: provider.provider,
      provider_mode: provider.mode,
      requires_manual_completion: provider.requiresManualCompletion ?? false,
    },
  })

  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders/${order.id}`)
  revalidatePath(`/orgs/${orgId}/finance`)
  return { ok: true, refundId: refund.id, provider }
}

export async function approveRefundAction(orgId: string, eventId: string, refundId: string) {
  const { supabase, userId } = await requireEventSupportAccess(orgId, eventId)

  const { data: refund } = await supabase
    .from("refunds")
    .select("id, payment_id, status, payments!inner(order_id, orders!inner(id, org_id, order_items!inner(ticket_types!inner(event_id))))")
    .eq("id", refundId)
    .maybeSingle()

  if (!refund) throw new Error("Refund not found")
  const payment = refund.payments as any
  const order = payment?.orders
  const items = Array.isArray(order?.order_items) ? order.order_items : []
  if (order?.org_id !== orgId || !items.some((item: any) => item?.ticket_types?.event_id === eventId)) {
    throw new Error("Refund does not belong to this event")
  }
  if (refund.status !== "requested") {
    throw new Error(`Refund cannot be approved from status: ${refund.status}`)
  }

  const provider = await initiateRefund(refundId)

  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: userId,
    table_name: "refunds",
    record_id: refundId,
    action: "other",
    changes: {
      event_type: "refund_submission_started",
      refund_id: refundId,
      order_id: order.id,
      event_id: eventId,
      provider: provider.provider,
      provider_mode: provider.mode,
      requires_manual_completion: provider.requiresManualCompletion ?? false,
    },
  })

  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders/${order.id}`)
  revalidatePath(`/orgs/${orgId}/finance`)
  return { ok: true, refundId, provider }
}

export async function revokeTicketAction(orgId: string, eventId: string, orderItemId: string) {
  const { supabase, userId } = await requireEventSupportAccess(orgId, eventId)

  const { data: item } = await supabase
    .from("order_items")
    .select("id, order_id, status, ticket_type_id, ticket_types!inner(event_id)")
    .eq("id", orderItemId)
    .maybeSingle()

  if (!item) throw new Error("Order item not found")
  if ((item.ticket_types as any)?.event_id !== eventId) throw new Error("Order item not in this event")
  if (item.status === "revoked") throw new Error("Already revoked")
  if (item.status === "refunded") throw new Error("Refunded tickets are already invalid")

  const { error } = await supabase
    .from("order_items")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", orderItemId)
  if (error) throw new Error(error.message)

  const { error: auditError } = await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: userId,
    table_name: "order_items",
    record_id: orderItemId,
    action: "other",
    changes: {
      event_type: "ticket_revoked",
      order_id: item.order_id,
      order_item_id: orderItemId,
      event_id: eventId,
    },
  })
  if (auditError) throw new Error(`Ticket revoked but audit logging failed: ${auditError.message}`)

  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders/${item.order_id}`)
  return { ok: true }
}

export async function bulkCheckIn(
  orgId: string,
  eventId: string,
  orderItemIds: string[],
): Promise<{ checkedCount: number; skippedCount: number; error?: string }> {
  if (orderItemIds.length === 0) return { checkedCount: 0, skippedCount: 0 }
  const supabase = createServerSupabaseClient()
  if (!supabase) return { checkedCount: 0, skippedCount: 0, error: "Unauthorized" }

  const { data, error } = await (supabase.rpc as any)("fn_bulk_check_in", {
    p_order_item_ids: orderItemIds,
    p_org_id: orgId,
  })
  if (error) return { checkedCount: 0, skippedCount: 0, error: error.message }

  const row = Array.isArray(data) ? data[0] : data
  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders`)
  return { checkedCount: row?.checked_count ?? 0, skippedCount: row?.skipped_count ?? 0 }
}

export async function issueCompTicket(
  orgId: string,
  eventId: string,
  ticketTypeId: string,
  recipientEmail: string,
  qty: number,
  note: string,
): Promise<{ orderId?: string; error?: string }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Unauthorized" }

  const { data, error } = await (supabase.rpc as any)("issue_comp_ticket", {
    p_org_id: orgId,
    p_ticket_type_id: ticketTypeId,
    p_recipient_email: recipientEmail,
    p_qty: qty,
    p_note: note || null,
  })
  if (error) return { error: error.message }

  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders`)
  return { orderId: data as string }
}
