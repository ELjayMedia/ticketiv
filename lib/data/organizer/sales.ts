"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface OrderSummary {
  total_orders: number
  total_revenue_cents: number
  total_refunded_cents: number
  pending_orders: number
}

export interface OrderDetail {
  id: string
  purchaser_email: string
  purchaser_first_name: string
  purchaser_last_name: string
  status: string
  total_amount_cents: number
  created_at: string
}

/**
 * Get order summary for organizer
 * Reads from: orders, payments, refunds
 */
export async function getOrgOrderSummary(orgId: string): Promise<OrderSummary> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { total_orders: 0, total_revenue_cents: 0, total_refunded_cents: 0, pending_orders: 0 }

  try {
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("id, status, total_amount_cents")
      .eq("org_id", orgId)

    if (ordersError || !orders) {
      console.error("[v0] Error fetching orders:", ordersError)
      return { total_orders: 0, total_revenue_cents: 0, total_refunded_cents: 0, pending_orders: 0 }
    }

    const totalRevenue = orders
      .filter((o) => o.status === "completed")
      .reduce((sum, o) => sum + (o.total_amount_cents || 0), 0)

    const pendingOrders = orders.filter((o) => o.status === "pending").length

    return {
      total_orders: orders.length,
      total_revenue_cents: totalRevenue,
      total_refunded_cents: 0,
      pending_orders: pendingOrders,
    }
  } catch (error) {
    console.error("[v0] Unexpected error fetching order summary:", error)
    return { total_orders: 0, total_revenue_cents: 0, total_refunded_cents: 0, pending_orders: 0 }
  }
}

/**
 * Get orders for organizer
 * Reads from: orders, order_items, order_adjustments
 */
export async function getOrgOrders(orgId: string, eventId?: string): Promise<OrderDetail[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("orders").select("*").eq("org_id", orgId)

    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const { data, error } = await query.order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching org orders:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching org orders:", error)
    return []
  }
}

/**
 * Get order adjustments
 * Reads from: order_adjustments
 */
export async function getOrderAdjustments(orderId: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("order_adjustments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching adjustments:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching adjustments:", error)
    return []
  }
}
