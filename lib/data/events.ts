"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_EVENTS, DEMO_VENUES, DEMO_TICKET_TYPES, getDemoEventById } from "@/lib/demo-data"
import type { EventSummary, EventDetail } from "@/types"

// Tables: events, event_dates, venues, ticket_types, ticket_type_channels, event_artists, artists

export async function getPublicEvents(params?: {
  limit?: number
  city?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  sort?: "date" | "price" | "popular"
}): Promise<EventSummary[]> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    let events = [...DEMO_EVENTS].filter((e) => e.status === "published")

    if (params?.city) {
      events = events.filter((e) => {
        const venue = DEMO_VENUES.find((v) => v.id === e.venue_id)
        return venue?.city?.toLowerCase().includes(params.city!.toLowerCase())
      })
    }

    if (params?.category) {
      events = events.filter((e) => e.category === params.category)
    }

    return events.slice(0, params?.limit || 24).map((e) => {
      const venue = DEMO_VENUES.find((v) => v.id === e.venue_id)
      const tickets = DEMO_TICKET_TYPES.filter((t) => t.event_id === e.id)
      const minPrice = tickets.length > 0 ? Math.min(...tickets.map((t) => t.price_cents)) : null

      return {
        id: e.id,
        title: e.title,
        slug: e.slug,
        city: venue?.city || null,
        category: e.category,
        visibility: e.status,
        venues: venue
          ? { id: venue.id, name: venue.name, address: venue.address_line1, city: venue.city, tz: venue.timezone }
          : null,
        event_dates: [{ id: `${e.id}-date`, starts_at: e.starts_at, ends_at: e.ends_at }],
        ticket_types: tickets.map((t) => ({ id: t.id, price_cents: t.price_cents, currency: t.currency })),
      }
    })
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  let query = supabase
    .from("events")
    .select(`
      id, title, slug, city, category, visibility,
      venues:venue_id ( id, name, address, tz ),
      event_dates ( id, starts_at, ends_at ),
      ticket_types ( id, price_cents, currency )
    `)
    .eq("visibility", "public")
    .limit(params?.limit || 24)

  if (params?.city) query = query.ilike("city", `%${params.city}%`)
  if (params?.category) query = query.eq("category", params.category)

  const { data, error } = await query
  if (error) throw error

  return data ?? []
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const event = DEMO_EVENTS.find((e) => e.slug === slug)
    if (!event) return null
    return getEventById(event.id)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("events")
    .select(`
      id, title, slug, description, city, category, venue_id, visibility,
      venues:venue_id ( id, name, address, city, tz, capacity ),
      event_dates ( id, starts_at, ends_at ),
      ticket_types ( id, name, price_cents, currency, quota, per_user_limit, is_reserved_seating ),
      event_artists ( role, artists ( id, name, bio, image_url, genre ) )
    `)
    .eq("slug", slug)
    .single()

  if (error) throw error
  return data
}

export async function getEventById(eventId: string): Promise<EventDetail | null> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const event = getDemoEventById(eventId)
    if (!event) return null

    return {
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      city: event.venue?.city || null,
      category: event.category,
      venue_id: event.venue_id,
      visibility: event.status,
      venues: event.venue
        ? {
            id: event.venue.id,
            name: event.venue.name,
            address: event.venue.address_line1,
            city: event.venue.city,
            tz: event.venue.timezone,
            capacity: event.venue.capacity,
          }
        : null,
      event_dates: [{ id: `${event.id}-date`, starts_at: event.starts_at, ends_at: event.ends_at }],
      ticket_types: event.ticket_types.map((t) => ({
        id: t.id,
        name: t.name,
        price: t.price_cents,
        currency: t.currency,
        quantity_total: t.quantity_total,
        quantity_remaining: t.quantity_remaining,
        per_user_limit: null,
        is_reserved_seating: false,
        ticket_type_channels: [{ channel: "web", quota: t.quantity_total, per_order_limit: 10 }],
      })),
      event_artists:
        event.artists?.map((a) => ({
          role: a.role || "performer",
          artists: { id: a.id, name: a.name, bio: a.bio, image_url: a.avatar_url, genre: null },
        })) || [],
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("events")
    .select(`
      id, title, slug, description, city, category, venue_id, visibility,
      venues:venue_id ( id, name, address, tz, capacity ),
      event_dates ( id, starts_at, ends_at ),
      ticket_types ( id, name, price_cents, currency, quota, per_user_limit, is_reserved_seating ),
      event_artists ( role, artists ( id, name, bio, image_url, genre ) )
    `)
    .eq("id", eventId)
    .single()

  if (error) throw error
  return data
}

export async function getEventTicketTypes(
  eventId: string,
  channel?: string,
): Promise<
  Array<{
    id: string
    event_id: string
    name: string
    description: string | null
    price: number
    currency: string
    quantity_total: number
    quantity_remaining: number
    per_user_limit: number | null
    is_reserved_seating: boolean
    ticket_type_channels: Array<{
      channel: string
      quota: number
      per_order_limit: number
    }>
  }>
> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const tickets = DEMO_TICKET_TYPES.filter((t) => t.event_id === eventId)
    return tickets.map((t) => ({
      id: t.id,
      event_id: t.event_id,
      name: t.name,
      description: t.description || null,
      price: t.price_cents,
      currency: t.currency,
      quantity_total: t.quantity_total,
      quantity_remaining: t.quantity_remaining,
      per_user_limit: null,
      is_reserved_seating: false,
      ticket_type_channels: [{ channel: "web", quota: t.quantity_total, per_order_limit: 10 }],
    }))
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const query = supabase
    .from("ticket_types")
    .select(`
      id, event_id, name, price_cents, currency, quantity_total, quantity_remaining,
      ticket_type_channels ( channel, quota, per_order_limit )
    `)
    .eq("event_id", eventId)

  const { data, error } = await query
  if (error) throw error

  if (!channel) return data ?? []

  return (data ?? []).map((t) => ({
    ...t,
    ticket_type_channels: ((t as any).ticket_type_channels || []).filter((c: any) => c.channel === channel),
  }))
}

export async function getEventLineup(eventId: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const event = getDemoEventById(eventId)
    return event?.artists || []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("event_artists")
    .select(`
      role,
      artists ( id, name, bio, image_url, genre )
    `)
    .eq("event_id", eventId)

  if (error) throw error
  return (data ?? []).map((ea: any) => ({ role: ea.role, ...ea.artists }))
}
