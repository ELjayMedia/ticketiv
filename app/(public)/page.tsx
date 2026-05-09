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
      venues:venue_id(name, city, address),
      ticket_types(price_cents, currency)
    `)
    .eq("status", "published")
    .order("starts_at", { ascending: true, nullsFirst: false })
    .limit(limit)

  if (error) {
    console.error("Failed to load home events", error)
    return []
  }

  return ((data ?? []) as RawHomeEvent[]).map((event) => {
    const venue = firstRelation(event.venues)
    const prices = event.ticket_types ?? []
    const pricedTickets = prices.filter((ticket) => typeof ticket.price_cents === "number")
    const minPrice = pricedTickets.length > 0 ? Math.min(...pricedTickets.map((ticket) => ticket.price_cents ?? 0)) : null
    const maxPrice = pricedTickets.length > 0 ? Math.max(...pricedTickets.map((ticket) => ticket.price_cents ?? 0)) : null
    const currency = prices.find((ticket) => ticket.currency)?.currency ?? "SZL"

    return {
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
  })
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
