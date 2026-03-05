"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { validateSchema, CheckoutSummaryViewSchema, type CheckoutSummaryView } from "@/lib/schemas/views"

/**
 * Adapter for order and checkout operations
 * Encapsulates order reads and validation
 */

export async function getCheckoutSummary(orderId: string): Promise<CheckoutSummaryView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch checkout summary")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_checkout_summary")
      .select("*")
      .eq("order_id", orderId)
      .single()

    if (error) {
      console.error("[v0] Error fetching checkout summary:", error)
      return null
    }

    if (!data) return null
    return validateSchema(CheckoutSummaryViewSchema, data, "v_checkout_summary")
  } catch (error) {
    console.error("[v0] Exception in getCheckoutSummary:", error)
    return null
  }
}

export async function validateOrderOwnership(
  orderId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot validate order ownership")
    return false
  }

  try {
    // Check if this user owns this order through v_my_tickets
    const { data, error } = await supabase
      .from("v_my_tickets")
      .select("order_id")
      .eq("order_id", orderId)
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found (expected case)
      console.error("[v0] Error validating order ownership:", error)
    }

    return !!data
  } catch (error) {
    console.error("[v0] Exception in validateOrderOwnership:", error)
    return false
  }
}

/**
 * Get order KPI for payment processing
 * This is a critical path - returns minimal data needed
 */
export async function getOrderKPIForPayment(orderId: string): Promise<{
  total_cents: number
  currency: string
  event_id: string
} | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch order KPI")
    return null
  }

  try {
    const summary = await getCheckoutSummary(orderId)
    if (!summary) return null

    return {
      total_cents: summary.total_cents,
      currency: summary.currency,
      event_id: summary.event_id,
    }
  } catch (error) {
    console.error("[v0] Exception in getOrderKPIForPayment:", error)
    return null
  }
}
