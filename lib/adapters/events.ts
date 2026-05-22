"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_EVENTS, DEMO_VENUES } from "@/lib/demo-data"
import { validateSchema, EventsPublicViewSchema, EventPublicViewSchema, type EventsPublicView, type EventPublicView } from "@/lib/schemas/views"

/**
 * Adapter for public events
 * Queries Supabase views and validates against TypeScript types
 */

export async function getPublicEventsList(params?: {
  limit?: number
  offset?: number
  city?: string
  category?: string
  search?: string
  sort?: "soonest" | "latest" | "price_low" | "price_high"
}): Promise<EventsPublicView[]> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    // Return demo data in production-like shape
    let events = DEMO_EVENTS.filter((e) => e.status === "published").map((event) => {
      const venue = DEMO_VENUES.find((v) => v.id === event.venue_id)
      return {
        id: event.id,
        title: event.title,
        slug: event.slug,
        category: event.category,
        city: venue?.city || null,
        country: venue?.country || null,
        poster_url: event.poster_url,
        starts_at: event.starts_at,
        venue_id: venue?.id || null,
        venue_name: venue?.name || null,
        venue_address: venue?.address_line1 || null,
        venue_tz: venue?.timezone || null,
        min_price_cents: 0,
        max_price_cents: 5000,
        currency: "USD",
        organizer_id: event.organizer_id || null,
        organizer_name: null,
        organizer_logo_url: null,
      }
    })

    if (params?.city) {
      events = events.filter((e) => e.city?.toLowerCase().includes(params.city!.toLowerCase()))
    }

    if (params?.category) {
      events = events.filter((e) => e.category === params.category)
    }

    if (params?.search) {
      const search = params.search.toLowerCase()
      events = events.filter((e) => e.title.toLowerCase().includes(search))
    }

    if (params?.sort === "price_low") {
      events.sort((a, b) => (a.min_price_cents || 0) - (b.min_price_cents || 0))
    } else if (params?.sort === "price_high") {
      events.sort((a, b) => (b.max_price_cents || 0) - (a.max_price_cents || 0))
    } else if (params?.sort === "latest") {
      events.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime())
    } else {
      // Default: soonest
      events.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    }

    const limit = params?.limit || 24
    const offset = params?.offset || 0

    return events.slice(offset, offset + limit)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty events list")
    return []
  }

  try {
    let query = supabase.from("v_events_public").select("*")

    if (params?.city) {
      query = query.ilike("city", `%${params.city}%`)
    }

    if (params?.category) {
      query = query.eq("category", params.category)
    }

    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`)
    }

    // Apply sorting
    const orderColumn = params?.sort === "price_low" ? "min_price_cents" : 
                        params?.sort === "price_high" ? "max_price_cents" :
                        params?.sort === "latest" ? "starts_at" : "starts_at"
    const ascending = params?.sort === "price_low"

    query = query.order(orderColumn, { ascending })

    // Apply pagination
    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error(
        `[v0] Error fetching public events from v_events_public — ${error.code ?? "no-code"}: ${error.message ?? "unknown"}${error.hint ? ` (hint: ${error.hint})` : ""}`,
      )
      return []
    }

    // Validate each item against schema
    if (!data) return []
    return data.map((item) => validateSchema(EventsPublicViewSchema, item, "v_events_public"))
  } catch (error) {
    console.error("[v0] Exception in getPublicEventsList:", error)
    return []
  }
}

export async function getPublicEventBySlug(slug: string): Promise<EventPublicView | null> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const event = DEMO_EVENTS.find((e) => e.slug === slug)
    if (!event) return null

    const venue = DEMO_VENUES.find((v) => v.id === event.venue_id)
    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      category: event.category,
      city: venue?.city || null,
      country: venue?.country || null,
      poster_url: event.poster_url,
      starts_at: event.starts_at,
      venue_id: venue?.id || null,
      venue_name: venue?.name || null,
      venue_address: venue?.address_line1 || null,
      venue_tz: venue?.timezone || null,
      venue_capacity: venue?.capacity || null,
      min_price_cents: 0,
      max_price_cents: 5000,
      currency: "USD",
      visibility: event.status as "public" | "private" | "unlisted",
      organizer_id: event.organizer_id || null,
      organizer_name: null,
      organizer_logo_url: null,
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch event details")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_event_public")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      console.error("[v0] Error fetching event by slug:", error)
      return null
    }

    if (!data) return null
    return validateSchema(EventPublicViewSchema, data, "v_event_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicEventBySlug:", error)
    return null
  }
}
