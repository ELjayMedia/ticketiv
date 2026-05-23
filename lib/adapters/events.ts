import { createPublicSupabaseClient } from "@/lib/supabase-public"
import { DEMO_EVENTS, DEMO_VENUES } from "@/lib/demo-data"
import { validateSchema, EventsPublicViewSchema, EventPublicViewSchema, type EventsPublicView, type EventPublicView } from "@/lib/schemas/views"

/**
 * Adapter for public events.
 *
 * These functions deliberately avoid cookies/auth-aware Supabase helpers so
 * public discovery and public event detail routes can use ISR/revalidation
 * without DynamicServerError noise. User-scoped reads belong in attendee,
 * checkout, organizer, scanner, or admin data modules instead.
 */

function getDemoPublicEvents(params?: {
  limit?: number
  offset?: number
  city?: string
  category?: string
  search?: string
  sort?: "soonest" | "latest" | "price_low" | "price_high"
}): EventsPublicView[] {
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
      featured_priority: null,
      tickets_sold: 0,
      tickets_available: 0,
      checked_in_count: 0,
      last_order_at: null,
      last_scan_at: null,
      live_stats_updated_at: null,
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
    events.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }

  const limit = params?.limit || 24
  const offset = params?.offset || 0

  return events.slice(offset, offset + limit)
}

function getDemoPublicEventBySlug(slug: string): EventPublicView | null {
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
    featured_priority: null,
    tickets_sold: 0,
    tickets_available: 0,
    checked_in_count: 0,
    last_order_at: null,
    last_scan_at: null,
    live_stats_updated_at: null,
  }
}

export async function getPublicEventsList(params?: {
  limit?: number
  offset?: number
  city?: string
  category?: string
  search?: string
  sort?: "soonest" | "latest" | "price_low" | "price_high"
}): Promise<EventsPublicView[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning demo events list")
    return getDemoPublicEvents(params)
  }

  try {
    let query = supabase.from("v_public_event_cards").select("*")

    if (params?.city) {
      query = query.ilike("city", `%${params.city}%`)
    }

    if (params?.category) {
      query = query.eq("category", params.category)
    }

    if (params?.search) {
      query = query.ilike("title", `%${params.search}%`)
    }

    const orderColumn = params?.sort === "price_low" ? "min_price_cents" : 
                        params?.sort === "price_high" ? "max_price_cents" :
                        params?.sort === "latest" ? "starts_at" : "starts_at"
    const ascending = params?.sort === "price_high" || params?.sort === "latest" ? false : true

    query = query.order(orderColumn, { ascending })

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error(
        `[v0] Error fetching public events from v_public_event_cards — ${error.code ?? "no-code"}: ${error.message ?? "unknown"}${error.hint ? ` (hint: ${error.hint})` : ""}`,
      )
      return getDemoPublicEvents(params)
    }

    if (!data) return []
    return data
      .map((item) => validateSchema(EventsPublicViewSchema, item, "v_public_event_cards"))
      .filter((row): row is EventsPublicView => row != null)
  } catch (error) {
    console.error("[v0] Exception in getPublicEventsList:", error)
    return getDemoPublicEvents(params)
  }
}

export async function getPublicEventBySlug(slug: string): Promise<EventPublicView | null> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning demo event detail")
    return getDemoPublicEventBySlug(slug)
  }

  try {
    const { data, error } = await supabase
      .from("v_event_public")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error) {
      console.error("[v0] Error fetching event by slug:", error)
      return getDemoPublicEventBySlug(slug)
    }

    if (!data) return null
    return validateSchema(EventPublicViewSchema, data, "v_event_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicEventBySlug:", error)
    return getDemoPublicEventBySlug(slug)
  }
}
