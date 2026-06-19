"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { EventKPIsViewSchema, type EventKPIsView } from "@/lib/schemas/views"

/**
 * Get KPI data for a single event (sales, check-ins, attendance rate)
 * Queries: v_event_kpis view
 * Validates: EventKPIsViewSchema
 */
export async function getEventKPIs(eventId: string): Promise<EventKPIsView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch event KPIs")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_event_kpis")
      .select("*")
      .eq("event_id", eventId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null
      }
      console.error("[v0] Error fetching event KPIs:", error)
      return null
    }

    // Validate against schema
    const validated = EventKPIsViewSchema.safeParse(data)
    if (!validated.success) {
      console.error("[v0] Event KPIs schema validation failed:", validated.error.errors)
      if (process.env.NODE_ENV === "development") {
        throw new Error(`KPI validation failed: ${JSON.stringify(validated.error.errors)}`)
      }
      return null
    }

    return validated.data
  } catch (error) {
    console.error("[v0] Unexpected error fetching event KPIs:", error)
    return null
  }
}

/**
 * Get KPI data for all events in an organization
 * Queries: v_event_kpis view filtered by org
 * Validates: EventKPIsViewSchema[]
 */
export async function getOrgEventKPIs(orgId: string): Promise<EventKPIsView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch org KPIs")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("v_event_kpis")
      .select("*")
      .eq("org_id", orgId)
      .order("event_date", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching org KPIs:", error)
      return []
    }

    // Validate all records
    const items = data || []
    const validated = items.map((item) => EventKPIsViewSchema.safeParse(item)).filter((result) => result.success)

    if (validated.length !== items.length) {
      console.error(
        `[v0] ${items.length - validated.length} records failed KPI schema validation`,
      )
    }

    return validated.map((result) => result.data)
  } catch (error) {
    console.error("[v0] Unexpected error fetching org KPIs:", error)
    return []
  }
}

