import type { EventCardData } from "@/components/standardized/event-card-standard"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import HomeClient from "./home-client"

export const dynamic = "force-dynamic"

type HomeVenue = {
  id: string
  name: string
  city: string | null
  address: string | null
  capacity: number | null
}

type HomeArtist = {
  id: string
  name: string
  bio?: string | null
  avatar_url?: string | null
  genre?: string | null
  role?: string | null
}

type RawHomeEvent = {
  id: string
  title: string
  slug: string | null
  cover_image_url: string | null
  starts_at: string | null
  city: string | null
  category: string | null
  series_id: string | null
  series?: { id: string; slug: string; title: string; series_type: "tour" | "recurring" | "season"; cover_image_url: string | null } | { id: string; slug: string; title: string; series_type: "tour" | "recurring" | "season"; cover_image_url: string | null }[] | null
  venues?: { name: string | null; city: string | null; address: string | null } | { name: string | null; city: string | null; address: string | null }[] | null
  ticket_types?: Array<{ price_cents: number | null; currency: string | null }> | null
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function getHomeEvents(limit = 24): Promise<EventCardData[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const nowIso = new Date().toISOString()

  const { data, error } = await supabase
    .from("events")
    .select(`
      id,
      title,
      slug,
      cover_image_url,
      starts_at,
      city,
      category,
      series_id,
      series:series_id(id, slug, title, series_type, cover_image_url),
      venues:venue_id(name, city, address),
      ticket_types(price_cents, currency)
    `)
    .eq("status", "published")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(120)

  if (error) {
    console.error("Failed to load home events", error)
    return []
  }

  const rawEvents = (data ?? []) as RawHomeEvent[]

  // Standalone events + tour-series events go in as individual cards.
  // Recurring/season series collapse into one card with "+N more dates".
  const collapsedSeries = new Map<string, { card: EventCardData; extra: number }>()
  const individuals: EventCardData[] = []

  for (const event of rawEvents) {
    const venue = firstRelation(event.venues)
    const series = firstRelation(event.series)
    const prices = event.ticket_types ?? []
    const pricedTickets = prices.filter((t) => typeof t.price_cents === "number")
    const minPrice = pricedTickets.length > 0 ? Math.min(...pricedTickets.map((t) => t.price_cents ?? 0)) : null
    const maxPrice = pricedTickets.length > 0 ? Math.max(...pricedTickets.map((t) => t.price_cents ?? 0)) : null
    const currency = prices.find((t) => t.currency)?.currency ?? "SZL"

    const baseCard: EventCardData = {
      id: event.id,
      slug: event.slug || event.id,
      title: event.title,
      poster_url: event.cover_image_url,
      starts_at: event.starts_at || new Date().toISOString(),
      city: event.city || venue?.city || null,
      venue_name: venue?.name || null,
      min_price_cents: minPrice,
      max_price_cents: maxPrice,
      currency,
      organizer_name: null,
    }

    if (!series || series.series_type === "tour") {
      individuals.push(baseCard)
      continue
    }

    // recurring or season: collapse on series id, keep earliest upcoming event's metadata
    const existing = collapsedSeries.get(series.id)
    if (existing) {
      existing.extra += 1
    } else {
      collapsedSeries.set(series.id, {
        card: {
          ...baseCard,
          id: `series-${series.id}`,
          slug: series.slug,
          title: series.title,
          poster_url: series.cover_image_url ?? baseCard.poster_url,
          series_slug: series.slug,
          series_extra_dates: 0,
        },
        extra: 0,
      })
    }
  }

  const collapsedCards = [...collapsedSeries.values()].map(({ card, extra }) => ({
    ...card,
    series_extra_dates: extra,
  }))

  return [...individuals, ...collapsedCards]
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, limit)
}

async function getHomeVenues(limit = 8): Promise<HomeVenue[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("venues")
    .select("id, name, city, address, capacity")
    .order("name", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Failed to load home venues", error)
    return []
  }

  return (data ?? []) as HomeVenue[]
}

async function getHomeArtists(limit = 10): Promise<HomeArtist[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("artists")
    .select("id, name, bio, image_url")
    .order("name", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Failed to load home artists", error)
    return []
  }

  return (data ?? []).map((artist: { id: string; name: string; bio: string | null; image_url: string | null }) => ({
    id: artist.id,
    name: artist.name,
    bio: artist.bio,
    avatar_url: artist.image_url,
    role: "Talent",
  }))
}

export default async function PublicHomePage() {
  const [events, venues, artists] = await Promise.all([
    getHomeEvents(24),
    getHomeVenues(8),
    getHomeArtists(10),
  ])

  return <HomeClient initialEvents={events} initialVenues={venues} initialArtists={artists} />
}
