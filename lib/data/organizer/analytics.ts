"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface EventMetric {
  day: string
  event_id: string
  org_id: string
  tickets_sold: number
  gross_revenue_cents: number
  refunds_cents: number
  unique_buyers: number
  created_at: string
}

export interface OrgMetric {
  day: string
  org_id: string
  tickets_sold: number
  gross_revenue_cents: number
  refunds_cents: number
  unique_buyers: number
  active_events: number
  created_at: string
}

export interface EventSalesBreakdown {
  event_id: string
  tickets_sold: number
  tickets_issued: number
  paid_orders: null
  gross_cents: number
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
 * Reads from org-scoped metrics only. Do not read mv_event_sales here:
 * it has no org_id and can leak cross-org sales when reused.
 */
export async function getSalesBreakdown(orgId: string, groupBy: "ticket_type" | "event" | "date" = "event") {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    if (groupBy === "event") {
      const { data, error } = await supabase
        .from("event_metrics_daily")
        .select("event_id, tickets_sold, gross_revenue_cents")
        .eq("org_id", orgId)
        .order("event_id", { ascending: true })
        .order("day", { ascending: true })
      if (error) { console.error("[v0] Error fetching event sales:", error); return [] }
      return aggregateEventSalesMetrics((data ?? []) as Array<Pick<EventMetric, "event_id" | "tickets_sold" | "gross_revenue_cents">>)
    }
    const { data, error } = await supabase.from("mv_revenue_breakdown").select("*").eq("org_id", orgId)

    if (error) {
      console.error("[v0] Error fetching revenue breakdown:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching sales breakdown:", error)
    return []
  }
}

export function aggregateEventSalesMetrics(
  rows: Array<Pick<EventMetric, "event_id" | "tickets_sold" | "gross_revenue_cents">>,
): EventSalesBreakdown[] {
  const byEvent = new Map<string, EventSalesBreakdown>()

  for (const row of rows) {
    const current = byEvent.get(row.event_id) ?? {
      event_id: row.event_id,
      tickets_sold: 0,
      tickets_issued: 0,
      paid_orders: null,
      gross_cents: 0,
    }
    current.tickets_sold += row.tickets_sold ?? 0
    current.tickets_issued += row.tickets_sold ?? 0
    current.gross_cents += row.gross_revenue_cents ?? 0
    byEvent.set(row.event_id, current)
  }

  return [...byEvent.values()]
}
