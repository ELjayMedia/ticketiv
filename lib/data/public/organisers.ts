

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { resolveEventLifecycle } from "@/lib/events/lifecycle"

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
      .select(`
        id, title, slug, description, cover_image_url, starts_at, ends_at, city, status,
        event_dates(starts_at, ends_at),
        venue:venue_id(name),
        ticket_types(price_cents, currency)
      `)
      .eq("org_id", orgId)
      .in("status", ["published", "cancelled"])
      .order("starts_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching organiser events:", error)
      return []
    }

    const nowMs = Date.now()
    return (data ?? []).map((event: any) => {
      const dates = (event.event_dates ?? [])
        .filter((date: any) => date?.starts_at)
        .slice()
        .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
      const nextDate = dates.find((date: any) => new Date(date.starts_at).getTime() >= nowMs)
      const finalDate = dates
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.ends_at ?? b.starts_at).getTime() -
            new Date(a.ends_at ?? a.starts_at).getTime(),
        )[0]
      const lifecycleEnd =
        finalDate?.ends_at ?? finalDate?.starts_at ?? event.ends_at ?? event.starts_at ?? null
      const lifecycle = resolveEventLifecycle({
        eventStartsAt: event.starts_at,
        eventEndsAt: lifecycleEnd,
        eventStatus: event.status,
        nowMs,
      })
      const priced = (event.ticket_types ?? []).filter(
        (ticket: any) => typeof ticket.price_cents === "number",
      )
      const minPrice =
        priced.length > 0
          ? Math.min(...priced.map((ticket: any) => ticket.price_cents as number))
          : null
      const currency =
        priced.find((ticket: any) => typeof ticket.currency === "string")?.currency ?? "SZL"

      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        poster_url: event.cover_image_url ?? null,
        starts_at: nextDate?.starts_at ?? event.starts_at ?? finalDate?.starts_at ?? null,
        city: event.city ?? null,
        venue_name: event.venue?.name ?? null,
        min_price_cents: minPrice,
        currency,
        status: event.status,
        lifecycle,
        lifecycle_end_at: lifecycleEnd,
      }
    })
  } catch (error) {
    console.error("[v0] Unexpected error fetching organiser events:", error)
    return []
  }
}
