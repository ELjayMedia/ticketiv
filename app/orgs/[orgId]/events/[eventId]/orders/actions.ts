"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

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
