import "server-only"

import { cache } from "react"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { EVENT_SUMMARY_SELECTION, mapToDetail, mapToSummary, type RawEvent } from "./events-helpers"
import type { EventDetail, EventSummary } from "@/types"

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
