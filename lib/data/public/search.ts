// Public ranked event search via fn_search_events RPC (Postgres FTS).

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface SearchFilters {
  q?: string
  category?: string
  city?: string
  startsAfter?: string // ISO
  startsBefore?: string // ISO
  maxPriceCents?: number
  onlyFree?: boolean
  limit?: number
  offset?: number
}

export interface SearchResultRow {
  id: string
  title: string
  slug: string | null
  cover_image_url: string | null
  starts_at: string | null
  city: string | null
  category: string | null
  venue_name: string | null
  min_price_cents: number | null
  currency: string | null
  rank: number
}

export interface SearchResults {
  query: string
  totalReturned: number
  rows: SearchResultRow[]
}

export async function searchEvents(filters: SearchFilters): Promise<SearchResults> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { query: filters.q ?? "", totalReturned: 0, rows: [] }

  const { data, error } = await supabase.rpc("fn_search_events", {
    p_query: filters.q ?? null,
    p_category: filters.category ?? null,
    p_city: filters.city ?? null,
    p_starts_after: filters.startsAfter ?? null,
    p_starts_before: filters.startsBefore ?? null,
    p_max_price_cents: typeof filters.maxPriceCents === "number" ? filters.maxPriceCents : null,
    p_only_free: filters.onlyFree ?? false,
    p_limit: filters.limit ?? 30,
    p_offset: filters.offset ?? 0,
  })

  if (error) {
    console.error("[search] fn_search_events failed", error)
    return { query: filters.q ?? "", totalReturned: 0, rows: [] }
  }

  const rows = (data ?? []) as SearchResultRow[]
  return {
    query: filters.q ?? "",
    totalReturned: rows.length,
    rows,
  }
}
