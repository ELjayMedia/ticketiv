"use server"

// Box-office POS: charge a buyer at the door. Composes the existing
// inventory-protected order RPC, then writes a payment row in the
// requested channel. Stays within Group A — no new Supabase RPC needed.

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"

const MANAGER_ROLES = new Set([
  "admin",
  "organizer",
  "organizer_owner",
  "organizer_admin",
  "organizer_staff",
  "pos",
])

export interface ChargeInput {
  orgId: string
  eventId: string
  items: Array<{ ticketTypeId: string; quantity: number }>
  method: "cash" | "upi" | "card" | "comp"
  buyer: { name: string | null; phone: string | null }
}

export async function posCharge(input: ChargeInput): Promise<{ orderId: string }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase unavailable")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Only org members with a POS-capable role may charge through the box office.
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", input.orgId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!member || !MANAGER_ROLES.has(String(member.role))) {
    throw new Error("Not authorized to charge at the box office")
  }

  if (input.items.length === 0) throw new Error("No tickets selected")

  const admin = createAdminClient()

  const { data: created, error: orderErr } = await admin.rpc("fn_create_inventory_protected_order", {
    p_event_id: input.eventId,
    p_buyer_id: user.id, // staff member is the buyer-of-record for POS
    p_buyer_email: user.email ?? null,
    p_items: input.items.map((i) => ({
      ticketTypeId: i.ticketTypeId,
      quantity: Math.max(1, Math.floor(i.quantity)),
    })),
    p_holder_name: input.buyer.name ?? null,
  })

  if (orderErr) {
    console.error("[pos] create_inventory_protected_order failed", orderErr)
    throw new Error(orderErr.message ?? "Could not start order")
  }

  const result = Array.isArray(created) ? created[0] : created
  const order = (result as { order_row?: { id?: string; total_cents?: number; currency?: string } } | null)
    ?.order_row
  if (!order?.id) throw new Error("Order RPC returned no order")

  // Mark this order as a POS-channel order so reporting splits correctly.
  await admin
    .from("orders")
    .update({
      channel: "pos",
      buyer_email: user.email ?? null,
    })
    .eq("id", order.id)

  // Record an immediate payment row in the chosen method. For comp tickets we
  // record a 0-amount payment with provider="comp" so the order still settles.
  const isComp = input.method === "comp"
  const { error: payErr } = await admin.from("payments").insert({
    order_id: order.id,
    provider: input.method,
    amount_cents: isComp ? 0 : order.total_cents ?? 0,
    currency: order.currency ?? "SZL",
    status: "succeeded",
    channel: "pos",
    payload: { source: "pos", buyer: input.buyer },
  })

  if (payErr) {
    console.error("[pos] payments insert failed", payErr)
    throw new Error("Order created but payment record failed")
  }

  return { orderId: order.id }
}
