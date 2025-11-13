import { cache } from "react"

import { createClient } from "@/lib/supabase"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type {
  EventDetail,
  EventRecord,
  EventSummary,
  TicketTypeRecord,
  EventDateRecord,
  VenueRecord,
} from "@/types"

const EVENT_SUMMARY_SELECTION = `
  *,
  event_dates!event_dates_event_id_fkey(*),
  ticket_types!ticket_types_event_id_fkey(*),
  venue:venues(*)
`

interface RawEvent extends EventRecord {
  event_dates?: EventDateRecord[] | null
  ticket_types?: TicketTypeRecord[] | null
  venue?: VenueRecord | null
}

function getPrimaryDate(dates?: EventDateRecord[] | null) {
  if (!dates || dates.length === 0) return null
  const explicitPrimary = dates.find((date) => date.is_primary)
  if (explicitPrimary) {
    return explicitPrimary
  }
  return [...dates].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0]
}

function deriveLocation(event: RawEvent): string | null {
  if (event.location) {
    return event.location
  }
  const venue = event.venue
  if (venue) {
    const parts = [venue.city, venue.region, venue.country].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(", ")
    }
    if (venue.name) {
      return venue.name
    }
  }
  return null
}

function deriveMinimumPrice(ticketTypes?: TicketTypeRecord[] | null): number | null {
  if (!ticketTypes || ticketTypes.length === 0) {
    return null
  }
  const prices = ticketTypes.map((ticket) => ticket.price).filter((value) => typeof value === "number")
  if (prices.length === 0) {
    return null
  }
  return Math.min(...prices)
}

function mapToSummary(event: RawEvent): EventSummary {
  const primaryDate = getPrimaryDate(event.event_dates ?? undefined)
  const minimumPrice = deriveMinimumPrice(event.ticket_types ?? undefined)

  return {
    id: event.id,
    slug: event.slug ?? null,
    title: event.title,
    summary: event.summary ?? event.description,
    description: event.description,
    category: event.category ?? null,
    status: event.status,
    currency: event.currency,
    cover_image_url: event.cover_image_url ?? null,
    venue_name: event.venue?.name ?? null,
    location: deriveLocation(event),
    starts_at: primaryDate?.starts_at ?? event.starts_at ?? null,
    ends_at: primaryDate?.ends_at ?? event.ends_at ?? null,
    minimum_price: minimumPrice,
    tickets_available: event.tickets_available ?? null,
    tickets_sold: event.tickets_sold ?? null,
    organizer_id: event.organizer_id ?? null,
  }
}

function mapToDetail(event: RawEvent): EventDetail {
  const summary = mapToSummary(event)

  return {
    ...summary,
    full_description: event.full_description ?? event.description,
    banner_image_url: event.banner_image_url ?? null,
    timezone: event.timezone,
    ticket_types: event.ticket_types ?? [],
    dates: event.event_dates ?? [],
    venue: event.venue ?? null,
  }
}

async function fetchEventsFromServer(filters?: { category?: string; search?: string }): Promise<EventSummary[]> {
  const supabase = createServerSupabaseClient()
  let query = supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECTION)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("starts_at", { ascending: true })

  if (filters?.category) {
    query = query.eq("category", filters.category)
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    console.error("Failed to load events", error)
    throw new Error("Unable to load events")
  }

  return (data ?? []).map((event) => mapToSummary(event as RawEvent))
}

export const getAllEvents = cache(async (filters?: { category?: string; search?: string }) => {
  return fetchEventsFromServer(filters)
})

export const getEventById = cache(async (id: string): Promise<EventDetail | null> => {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECTION)
    .eq("id", id)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch event", error)
    throw new Error("Unable to load event")
  }

  if (!data) {
    return null
  }

  return mapToDetail(data as RawEvent)
})

export const getEventBySlug = cache(async (slug: string): Promise<EventDetail | null> => {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECTION)
    .eq("slug", slug)
    .single()

  if (error && error.code !== "PGRST116") {
    console.error("Failed to fetch event by slug", error)
    throw new Error("Unable to load event")
  }

  if (!data) {
    return null
  }

  return mapToDetail(data as RawEvent)
})

export async function getEventsByCategory(category: string) {
  return fetchEventsFromServer({ category })
}

export async function getEventsUsingClient(filters?: { category?: string; search?: string }) {
  const supabase = createClient()
  let query = supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECTION)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("starts_at", { ascending: true })

  if (filters?.category) {
    query = query.eq("category", filters.category)
  }

  if (filters?.search) {
    query = query.or(
      `title.ilike.%${filters.search}%,summary.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
    )
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []).map((event) => mapToSummary(event as RawEvent))
}

export async function getOrganizerEventMetrics(organizerId: string) {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SUMMARY_SELECTION)
    .eq("organizer_id", organizerId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Failed to load organizer events", error)
    throw new Error("Unable to load organizer events")
  }

  return (data ?? []).map((event) => {
    const detail = mapToDetail(event as RawEvent)
    return {
      id: detail.id,
      title: detail.title,
      status: detail.status,
      ticketsAvailable: detail.tickets_available ?? undefined,
      ticketsSold: detail.tickets_sold ?? undefined,
      ticketTypes: detail.ticket_types,
      startsAt: detail.starts_at,
      endsAt: detail.ends_at,
      minimumPrice: detail.minimum_price,
    }
  })
}
