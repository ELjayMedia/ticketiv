"use server"

/**
 * Public Events Data Layer
 * 
 * This module provides backward-compatible exports that use the new
 * adapter-based system. Gradually migrate components to use the adapters directly
 * from /lib/adapters/events.ts
 * 
 * NEW: Use getPublicEventsList() and getPublicEventBySlug() from /lib/adapters
 * LEGACY: Existing functions below for backward compatibility
 */

import { getPublicEventsList, getPublicEventBySlug } from "@/lib/adapters/events"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_EVENTS, DEMO_VENUES, DEMO_TICKET_TYPES, getDemoEventById } from "@/lib/demo-data"
import type { EventSummary, EventDetail } from "@/types"

// Re-export the new adapter functions for migration
export { getPublicEventsList, getPublicEventBySlug }

/**
 * LEGACY: getPublicEvents
 * @deprecated Use getPublicEventsList() instead
 */
export async function getPublicEvents(params?: {
  limit?: number
  city?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  sort?: "date" | "price" | "popular"
}): Promise<EventSummary[]> {
  // Use new adapter
  const events = await getPublicEventsList({
    limit: params?.limit,
    city: params?.city,
    category: params?.category,
    sort: params?.sort === "price" ? "price_low" : params?.sort === "date" ? "soonest" : undefined,
  })

  // Transform from view shape to legacy shape
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    city: e.city,
    category: e.category,
    visibility: "public" as const,
    venues: e.venue_id ? {
      id: e.venue_id,
      name: e.venue_name,
      address: e.venue_address,
      city: e.city,
      tz: e.venue_tz,
    } : null,
    event_dates: [{ id: `${e.id}-date`, starts_at: e.starts_at, ends_at: e.starts_at }],
    ticket_types: [{ id: "ticket", price_cents: e.min_price_cents, currency: e.currency }],
  }))
}

/**
 * LEGACY: getEventBySlug
 * @deprecated Use getPublicEventBySlug() instead
 */
export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const event = await getPublicEventBySlug(slug)
  if (!event) return null

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    city: event.city,
    category: event.category,
    venue_id: event.venue_id,
    visibility: event.visibility,
    venues: event.venue_id ? {
      id: event.venue_id,
      name: event.venue_name,
      address: event.venue_address,
      city: event.city,
      tz: event.venue_tz,
      capacity: event.venue_capacity,
    } : null,
    event_dates: [{ id: `${event.id}-date`, starts_at: event.starts_at, ends_at: event.starts_at }],
    ticket_types: [
      {
        id: "ticket",
        name: "General Admission",
        price_cents: event.min_price_cents,
        currency: event.currency,
        quota: 100,
        per_user_limit: null,
        is_reserved_seating: false,
      },
    ],
    event_artists: [],
  }
}

/**
 * LEGACY: getEventById
 * @deprecated Use getPublicEventBySlug() instead
 */
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
      event_artists ( role, artists ( id, name, bio, genre ) )
    `)
    .eq("id", eventId)
    .single()

  if (error) throw error
  return data
}

/**
 * LEGACY: getEventTicketTypes
 */
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

/**
 * LEGACY: getEventLineup
 */
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
      artists ( id, name, bio, genre )
    `)
    .eq("event_id", eventId)

  if (error) throw error
  return (data ?? []).map((ea: any) => ({ role: ea.role, ...ea.artists }))
}
