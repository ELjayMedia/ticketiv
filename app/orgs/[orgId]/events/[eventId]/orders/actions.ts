"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { revalidatePath } from "next/cache"

// TICK-49 — Support actions gated on org admin membership

async function requireEventOrgAdmin(orgId: string, eventId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not authenticated")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()

  const adminRoles = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
  if (!member || !adminRoles.has(String(member.role))) {
    throw new Error("Forbidden: org admin role required")
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) throw new Error("Event not found")

  return { supabase, userId: session.user.id }
}

export async function initiateRefundAction(
  orgId: string,
  eventId: string,
  orderItemId: string,
  reason: string,
) {
  const { supabase, userId } = await requireEventOrgAdmin(orgId, eventId)

  // Verify the order_item belongs to this event via ticket_type
  const { data: item } = await supabase
    .from("order_items")
    .select("id, status, ticket_type_id, ticket_types!inner(event_id)")
    .eq("id", orderItemId)
    .maybeSingle()

  if (!item) throw new Error("Order item not found")
  if ((item.ticket_types as any)?.event_id !== eventId) throw new Error("Order item not in this event")
  if (!["issued", "checked_in"].includes(item.status)) {
    throw new Error(`Cannot refund item with status: ${item.status}`)
  }

  // Insert into refunds table (triggers handle_refund_processed cascade)
  const { data: orderData } = await supabase
    .from("order_items")
    .select("order_id, orders!inner(total_cents, currency, org_id)")
    .eq("id", orderItemId)
    .maybeSingle()

  if (!orderData) throw new Error("Order not found")

  const order = (orderData as any).orders
  if (order.org_id !== orgId) throw new Error("Order does not belong to this org")

  const { data: paymentRow } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", orderData.order_id)
    .in("status", ["succeeded"])
    .maybeSingle()

  if (!paymentRow) throw new Error("No paid payment found for this order")

  const { error } = await supabase.from("refunds").insert({
    payment_id: paymentRow.id,
    amount_cents: (order as any).total_cents ?? 0,
    currency: (order as any).currency ?? "SZL",
    type: "organizer_initiated" as any,
    status: "requested",
    initiated_by: userId,
  })

  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function revokeTicketAction(
  orgId: string,
  eventId: string,
  orderItemId: string,
) {
  const { supabase } = await requireEventOrgAdmin(orgId, eventId)

  const { data: item } = await supabase
    .from("order_items")
    .select("id, status, ticket_type_id, ticket_types!inner(event_id)")
    .eq("id", orderItemId)
    .maybeSingle()

  if (!item) throw new Error("Order item not found")
  if ((item.ticket_types as any)?.event_id !== eventId) throw new Error("Order item not in this event")
  if (item.status === "revoked") throw new Error("Already revoked")

  const { error } = await supabase
    .from("order_items")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", orderItemId)

  if (error) throw new Error(error.message)
  return { ok: true }
}

// TICK-235: Bulk check-in selected attendees
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
  return {
    checkedCount: row?.checked_count ?? 0,
    skippedCount: row?.skipped_count ?? 0,
  }
}

// TICK-237: Issue a complimentary ticket
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
