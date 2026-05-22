"use server"

// Box-office POS: single transactional charge via fn_pos_charge. The RPC
// wraps order creation + payment insert + channel marking so a crashed
// server can't leave the order half-settled.

import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

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

  if (input.items.length === 0) throw new Error("No tickets selected")

  // Authorization + transaction live inside fn_pos_charge (SECURITY DEFINER
  // with an explicit role check via user_has_org_role). All we do here is
  // call it with the caller's session.
  const { data, error } = await supabase.rpc("fn_pos_charge", {
    p_event_id: input.eventId,
    p_items: input.items.map((i) => ({
      ticketTypeId: i.ticketTypeId,
      quantity: Math.max(1, Math.floor(i.quantity)),
    })),
    p_payment_method: input.method,
    p_buyer_name: input.buyer.name,
    p_buyer_email: null,
    p_buyer_phone: input.buyer.phone,
  })

  if (error) {
    console.error("[pos] fn_pos_charge failed", error)
    throw new Error(error.message ?? "Charge failed")
  }

  const orderId = (data as { order_id?: string } | null)?.order_id
  if (!orderId) throw new Error("Charge RPC returned no order id")

  return { orderId }
}
