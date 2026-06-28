// TICK-271 — find guest orders the signed-in user can claim by verified contact.
// RLS-safe: backed by the SECURITY DEFINER fn_find_claimable_guest_orders, which
// only matches the caller's own confirmed email/phone.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ClaimableGuestOrder {
  orderId: string
  createdAt: string
  totalCents: number
  currency: string | null
  itemCount: number
  eventTitle: string | null
}

export async function findClaimableGuestOrders(): Promise<ClaimableGuestOrder[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Guests (anonymous) and signed-out users have nothing to reconcile here.
  if (!user || (user as { is_anonymous?: boolean }).is_anonymous) return []

  const { data, error } = await supabase.rpc("fn_find_claimable_guest_orders")
  if (error) {
    console.error("[guest-claim] find:", error)
    return []
  }

  return (data ?? []).map((r) => ({
    orderId: r.order_id,
    createdAt: r.created_at,
    totalCents: r.total_cents,
    currency: r.currency,
    itemCount: r.item_count,
    eventTitle: r.event_title,
  }))
}
