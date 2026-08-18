"use server"

import { revalidatePath } from "next/cache"

import { reconcileRefund } from "@/lib/payments/refunds"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const SUPPORT_ROLES = new Set([
  "admin",
  "organizer",
  "organizer_owner",
  "organizer_admin",
  "finance",
  "finance_manager",
])

export async function reconcileRefundAction(
  orgId: string,
  eventId: string,
  orderId: string,
  refundId: string,
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

  const { data: order } = await supabase
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!order) throw new Error("Order not found")

  const { data: paymentRows } = await supabase
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
  const paymentIds = (paymentRows ?? []).map((payment) => payment.id)
  if (paymentIds.length === 0) throw new Error("Order has no payment")

  const { data: refund } = await supabase
    .from("refunds")
    .select("id")
    .eq("id", refundId)
    .in("payment_id", paymentIds)
    .maybeSingle()
  if (!refund) throw new Error("Refund does not belong to this order")

  const result = await reconcileRefund(refundId)
  revalidatePath(`/orgs/${orgId}/events/${eventId}/orders/${orderId}`)
  revalidatePath(`/orgs/${orgId}/finance`)
  return result
}
