"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { validateSchema, OrganizerEventsViewSchema, EventOrdersViewSchema, OrganizerDashboardViewSchema, type OrganizerEventsView, type EventOrdersView, type OrganizerDashboardView } from "@/lib/schemas/views"

/**
 * Adapter for organizer event management views
 * Used by organizers to manage and analyze their events
 */

export async function getOrganizerEventsList(
  orgId: string,
  params?: {
    limit?: number
    offset?: number
    status?: "draft" | "published" | "archived" | "cancelled"
    sort?: "recent" | "upcoming" | "popular"
  }
): Promise<OrganizerEventsView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch organizer events")
    return []
  }

  try {
    let query = supabase
      .from("v_organizer_events")
      .select("*")
      .eq("org_id", orgId)

    if (params?.status) {
      query = query.eq("status", params.status)
    }

    // Apply sorting
    if (params?.sort === "upcoming") {
      query = query.order("starts_at", { ascending: true })
    } else if (params?.sort === "popular") {
      query = query.order("ticket_sales", { ascending: false })
    } else {
      // Default: recent
      query = query.order("starts_at", { ascending: false })
    }

    // Apply pagination
    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching organizer events:", error)
      return []
    }

    if (!data) return []
    return data.map((item) => validateSchema(OrganizerEventsViewSchema, item, "v_organizer_events"))
  } catch (error) {
    console.error("[v0] Exception in getOrganizerEventsList:", error)
    return []
  }
}

export async function getEventOrders(
  eventId: string,
  params?: {
    limit?: number
    offset?: number
    status?: "pending" | "completed" | "failed" | "refunded"
  }
): Promise<EventOrdersView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch event orders")
    return []
  }

  try {
    let query = supabase
      .from("v_event_orders")
      .select("*")
      .eq("event_id", eventId)

    if (params?.status) {
      query = query.eq("status", params.status)
    }

    query = query.order("ordered_at", { ascending: false })

    // Apply pagination
    const limit = params?.limit || 50
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching event orders:", error)
      return []
    }

    if (!data) return []
    return data.map((item) => validateSchema(EventOrdersViewSchema, item, "v_event_orders"))
  } catch (error) {
    console.error("[v0] Exception in getEventOrders:", error)
    return []
  }
}

export async function getOrganizerDashboardStats(orgId: string): Promise<OrganizerDashboardView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch dashboard stats")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_organizer_dashboard")
      .select("*")
      .eq("org_id", orgId)
      .single()

    if (error) {
      console.error("[v0] Error fetching dashboard stats:", error)
      return null
    }

    if (!data) return null
    return validateSchema(OrganizerDashboardViewSchema, data, "v_organizer_dashboard")
  } catch (error) {
    console.error("[v0] Exception in getOrganizerDashboardStats:", error)
    return null
  }
}
