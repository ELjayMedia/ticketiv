"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { validateSchema, OrganizerPublicViewSchema, OrganizerEventsPublicViewSchema, type OrganizerPublicView, type EventsPublicView } from "@/lib/schemas/views"

/**
 * Adapter for public organizer profiles
 */

export async function getPublicOrganizersList(params?: {
  limit?: number
  offset?: number
  search?: string
}): Promise<OrganizerPublicView[]> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    // Return demo organizers
    const demoOrganizers: OrganizerPublicView[] = [
      {
        id: "demo-org-1",
        name: "Demo Concerts",
        slug: "demo-concerts",
        bio: "Your favorite concert promoter",
        logo_url: null,
        website: null,
        social_links: null,
        event_count: 5,
      },
    ]

    let filtered = demoOrganizers

    if (params?.search) {
      const search = params.search.toLowerCase()
      filtered = filtered.filter((o) => o.name.toLowerCase().includes(search))
    }

    const limit = params?.limit || 24
    const offset = params?.offset || 0

    return filtered.slice(offset, offset + limit)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty organizers list")
    return []
  }

  try {
    let query = supabase.from("v_organizer_public").select("*")

    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`)
    }

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching public organizers:", error)
      return []
    }

    if (!data) return []
    return data.map((item) => validateSchema(OrganizerPublicViewSchema, item, "v_organizer_public"))
  } catch (error) {
    console.error("[v0] Exception in getPublicOrganizersList:", error)
    return []
  }
}

export async function getPublicOrganizerById(organizerId: string): Promise<OrganizerPublicView | null> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    if (organizerId === "demo-org-1") {
      return {
        id: "demo-org-1",
        name: "Demo Concerts",
        slug: "demo-concerts",
        bio: "Your favorite concert promoter",
        logo_url: null,
        website: null,
        social_links: null,
        event_count: 5,
      }
    }
    return null
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch organizer details")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_organizer_public")
      .select("*")
      .eq("id", organizerId)
      .single()

    if (error) {
      console.error("[v0] Error fetching organizer:", error)
      return null
    }

    if (!data) return null
    return validateSchema(OrganizerPublicViewSchema, data, "v_organizer_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicOrganizerById:", error)
    return null
  }
}

export async function getPublicOrganizerEvents(organizerId: string, params?: {
  limit?: number
  offset?: number
}): Promise<EventsPublicView[]> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    // Import demo events for the organizer
    // For now, return empty - would be populated from DEMO_EVENTS
    return []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty organizer events")
    return []
  }

  try {
    let query = supabase
      .from("v_organizer_events_public")
      .select("*")
      .eq("organizer_id", organizerId)

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching organizer events:", error)
      return []
    }

    if (!data) return []
    return validateSchema(OrganizerEventsPublicViewSchema, data, "v_organizer_events_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicOrganizerEvents:", error)
    return []
  }
}
