"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface EventMetric {
  date: string
  tickets_sold: number
  revenue_cents: number
  refunds_cents: number
  orders_count: number
}

export interface OrgMetric {
  date: string
  total_revenue_cents: number
  total_orders: number
  total_tickets_sold: number
}

/**
 * Get daily event metrics
 * Reads from: event_metrics_daily
 */
export async function getEventMetrics(eventId: string, days: number = 30): Promise<EventMetric[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from("event_metrics_daily")
      .select("*")
      .eq("event_id", eventId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching event metrics:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching event metrics:", error)
    return []
  }
}

/**
 * Get org-wide metrics
 * Reads from: org_metrics_daily
 */
export async function getOrgMetrics(orgId: string, days: number = 30): Promise<OrgMetric[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const { data, error } = await supabase
      .from("org_metrics_daily")
      .select("*")
      .eq("org_id", orgId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching org metrics:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching org metrics:", error)
    return []
  }
}

/**
 * Get sales breakdown by ticket type or other dimensions
 * Reads from: mv_event_sales, mv_revenue_breakdown
 */
export async function getSalesBreakdown(orgId: string, groupBy: "ticket_type" | "event" | "date" = "event") {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const view = groupBy === "event" ? "mv_event_sales" : "mv_revenue_breakdown"

    const { data, error } = await supabase.from(view).select("*").eq("org_id", orgId)

    if (error) {
      console.error(`[v0] Error fetching sales breakdown from ${view}:`, error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching sales breakdown:", error)
    return []
  }
}
