import { createClient } from "@/lib/supabase"
import { EVENT_SUMMARY_SELECTION, mapToSummary, type RawEvent } from "./events-helpers"
import type { EventSummary } from "@/types"

export async function getEventsUsingClient(filters?: { category?: string; search?: string }): Promise<EventSummary[]> {
  const supabase = createClient()

  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty events")
    return []
  }

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
