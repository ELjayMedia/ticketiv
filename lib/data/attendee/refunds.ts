"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Refund {
  id: string
  order_id: string
  reason: string
  status: "pending" | "approved" | "rejected" | "processed"
  requested_at: string
  processed_at?: string
  amount_cents: number
  created_at: string
}

export interface RefundItem {
  id: string
  refund_id: string
  order_item_id: string
  reason: string
  created_at: string
}

/**
 * Get refunds for a user
 * Reads from: refunds, refund_items
 */
export async function getUserRefunds(userId: string): Promise<Refund[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("refunds")
      .select("*")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching refunds:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching refunds:", error)
    return []
  }
}

/**
 * Get refund details with items
 * Reads from: refunds, refund_items
 */
export async function getRefundDetail(refundId: string): Promise<(Refund & { items: RefundItem[] }) | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .select("*")
      .eq("id", refundId)
      .maybeSingle()

    if (refundError || !refund) {
      console.error("[v0] Error fetching refund:", refundError)
      return null
    }

    let items = [] as RefundItem[]
    const { error: itemsError } = await supabase
      .from("refund_items")
      .select("*")
      .eq("refund_id", refundId)

    if (itemsError) {
      console.error("[v0] Error fetching refund items:", itemsError)
    } else {
      items = await supabase
        .from("refund_items")
        .select("*")
        .eq("refund_id", refundId)
        .then(response => response.data || [])
    }

    return {
      ...refund,
      items: items || [],
    }
  } catch (error) {
    console.error("[v0] Unexpected error fetching refund detail:", error)
    return null
  }
}

/**
 * Request a refund for an order item
 * Writes to: refunds, refund_items
 */
export async function requestRefund(
  orderItemId: string,
  reason: string,
  amountCents: number
): Promise<Refund | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.user) {
      console.error("[v0] User not authenticated")
      return null
    }

    // Get the order for this item
    const { data: orderItem } = await supabase
      .from("order_items")
      .select("order_id")
      .eq("id", orderItemId)
      .maybeSingle()

    if (!orderItem) {
      console.error("[v0] Order item not found")
      return null
    }

    // Create refund
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .insert({
        order_id: orderItem.order_id,
        user_id: session.data.session.user.id,
        reason,
        status: "pending",
        requested_at: new Date().toISOString(),
        amount_cents: amountCents,
      })
      .select()
      .single()

    if (refundError || !refund) {
      console.error("[v0] Error creating refund:", refundError)
      return null
    }

    // Create refund item
    await supabase.from("refund_items").insert({
      refund_id: refund.id,
      order_item_id: orderItemId,
      reason,
    })

    return refund
  } catch (error) {
    console.error("[v0] Unexpected error requesting refund:", error)
    return null
  }
}
