"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
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
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const query = supabase
    .from("ticket_types")
    .select(`
      id, event_id, name, price_cents, currency, quota,
      ticket_type_channels ( channel, quota, per_order_limit )
    `)
    .eq("event_id", eventId)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []).map((t) => ({
    ...t,
    quantity_total: t.quota,
    quantity_remaining: t.quota,
    ticket_type_channels: ((t as any).ticket_type_channels || []),
  }))

  if (!channel) return rows

  return rows.map((t) => ({
    ...t,
    ticket_type_channels: t.ticket_type_channels.filter((c: any) => c.channel === channel),
  }))
}

export async function getEventLineup(eventId: string) {
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
