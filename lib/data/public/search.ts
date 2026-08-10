// Public ranked event search via fn_search_events RPC (Postgres FTS).

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createPublicSupabaseClient } from "@/lib/supabase-public"

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
  /** Joined from `organizations` — present after the trust-signals migration. */
  organizer_name?: string | null
  /** Joined from `organizations.logo` — used as the verified-organizer signal. */
  organizer_logo_url?: string | null
  /** From `event_live_stats.tickets_sold`. Hidden client-side below the
   *  safe-display threshold so we don't fake momentum. */
  tickets_sold?: number | null
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
    p_query: filters.q ?? undefined,
    p_category: filters.category ?? undefined,
    p_city: filters.city ?? undefined,
    p_starts_after: filters.startsAfter ?? undefined,
    p_starts_before: filters.startsBefore ?? undefined,
    p_max_price_cents: typeof filters.maxPriceCents === "number" ? filters.maxPriceCents : undefined,
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

export interface SearchFacets {
  categories: string[]
  cities: string[]
}

/**
 * Distinct category + city values across currently-published public events,
 * surfaced to drive the discovery filter selects. Reads the same anonymous
 * `v_public_event_cards` view used by the home discover route, so the lists
 * always match what users can actually find. Errors and missing config
 * collapse to empty arrays — the filter bar degrades to a search-only mode.
 */
export async function getPublicSearchFacets(): Promise<SearchFacets> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return { categories: [], cities: [] }

  const { data, error } = await supabase
    .from("v_public_event_cards")
    .select("category, city")
    .limit(500)

  if (error || !data) {
    if (error) console.error("[search] facet fetch failed", error)
    return { categories: [], cities: [] }
  }

  const categories = new Set<string>()
  const cities = new Set<string>()
  for (const row of data as Array<{ category: string | null; city: string | null }>) {
    if (row.category && row.category.trim()) categories.add(row.category)
    if (row.city && row.city.trim()) cities.add(row.city)
  }

  return {
    categories: [...categories].sort((a, b) => a.localeCompare(b)),
    cities: [...cities].sort((a, b) => a.localeCompare(b)),
  }
}

/** Date-range presets accepted via `?when=` on the search route. */
export type WhenPreset = "today" | "tonight" | "weekend" | "week" | "month"

/**
 * Resolve a `when` preset into an ISO `startsAfter` / `startsBefore` pair.
 * Returns nulls when the preset is unrecognised so callers can fall back to
 * explicit date inputs.
 */
export function resolveWhenPreset(
  preset: string | undefined,
  now: Date = new Date(),
): { startsAfter: string | null; startsBefore: string | null } {
  if (!preset) return { startsAfter: null, startsBefore: null }

  const start = new Date(now)
  const end = new Date(now)

  switch (preset as WhenPreset) {
    case "tonight":
      end.setHours(end.getHours() + 6)
      break
    case "weekend": {
      // Next Saturday 00:00 → Sunday 23:59 (today if today is Sat/Sun).
      const day = start.getDay() // 0=Sun, 6=Sat
      const daysUntilSat = (6 - day + 7) % 7
      if (day !== 0 && day !== 6) start.setDate(start.getDate() + daysUntilSat)
      start.setHours(0, 0, 0, 0)
      end.setTime(start.getTime())
      // If we landed on Saturday, end on Sunday; if Sunday, end same day.
      end.setDate(end.getDate() + (start.getDay() === 6 ? 1 : 0))
      end.setHours(23, 59, 59, 999)
      break
    }
    case "week":
      end.setDate(end.getDate() + 7)
      break
    case "month":
      end.setMonth(end.getMonth() + 1)
      break
    default:
      return { startsAfter: null, startsBefore: null }
  }

  return { startsAfter: start.toISOString(), startsBefore: end.toISOString() }
}
