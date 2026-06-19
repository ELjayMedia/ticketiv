

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface OrganiserSummary {
  id: string
  name: string
  bio?: string | null
  logo?: string | null
  upcoming_events_count: number
}

export interface OrganiserDetail {
  id: string
  name: string
  bio?: string | null
  logo?: string | null
  created_at?: string
}

/**
 * Get all public organisers
 * Reads from: organizations table
 */
export async function getPublicOrganisers(params?: {
  limit?: number
  offset?: number
}): Promise<OrganiserSummary[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, bio, logo")
      .order("name")
      .limit(params?.limit || 50)
      .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 50) - 1)

    if (error) {
      console.error("[v0] Error fetching public organisers:", error)
      return []
    }

    if (!data) return []

    // Fetch upcoming events count for each organiser
    const organisersWithCounts = await Promise.all(
      data.map(async (org) => {
        const { count } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("org_id", org.id)
          .eq("status", "published")
          .gt("starts_at", new Date().toISOString())

        return {
          ...org,
          upcoming_events_count: count || 0,
        }
      })
    )

    return organisersWithCounts
  } catch (error) {
    console.error("[v0] Unexpected error fetching public organisers:", error)
    return []
  }
}

/**
 * Get organiser detail with events
 * Reads from: organizations, events, event_dates, venues
 */
export async function getOrganiserDetail(orgId: string): Promise<OrganiserDetail & { events_count: number } | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name, bio, logo, created_at")
      .eq("id", orgId)
      .maybeSingle()

    if (orgError || !org) {
      console.error("[v0] Error fetching organiser detail:", orgError)
      return null
    }

    // Get events count
    const { count: eventsCount } = await supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("status", "published")

    return {
      id: org.id,
      name: org.name,
      bio: org.bio,
      logo: org.logo,
      created_at: org.created_at,
      events_count: eventsCount || 0,
    }
  } catch (error) {
    console.error("[v0] Unexpected error fetching organiser detail:", error)
    return null
  }
}

/**
 * Get public events for an organiser
 * Reads from: v_events_public filtered by org_id
 */
export async function getOrganiserEvents(orgId: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("events")
      .select("id, title, slug, description, starts_at, ends_at")
      .eq("org_id", orgId)
      .eq("status", "published")
      .order("starts_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching organiser events:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching organiser events:", error)
    return []
  }
}
