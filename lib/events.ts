import "server-only"

import { cache } from "react"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { EVENT_SUMMARY_SELECTION, mapToDetail, mapToSummary, type RawEvent } from "./events-helpers"
import type { EventDetail, EventSummary } from "@/types"

// Fallback mock data when Supabase is not configured
const MOCK_EVENTS: EventSummary[] = [
  {
    id: "1",
    title: "Summer Music Festival",
    summary: "Experience live music from top artists",
    category: "Music",
    city: "New York",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    image_url: "/placeholder.svg?height=300&width=400",
    minimum_price: 50,
  },
  {
    id: "2",
    title: "Tech Conference 2024",
    summary: "Latest innovations in technology",
    category: "Technology",
    city: "San Francisco",
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    image_url: "/placeholder.svg?height=300&width=400",
    minimum_price: 100,
  },
  {
    id: "3",
    title: "Comedy Night Live",
    summary: "Stand-up comedy from renowned comedians",
    category: "Comedy",
    city: "Los Angeles",
    starts_at: new Date(Date.now() + 259200000).toISOString(),
    image_url: "/placeholder.svg?height=300&width=400",
    minimum_price: 35,
  },
]

// Fallback mock data for event detail page when Supabase is not configured
const MOCK_EVENTS_DETAIL: Record<string, EventDetail> = {
  "1": {
    id: "1",
    title: "Summer Music Festival 2024",
    description: "Experience live music from top artists",
    full_description:
      "Join us for an unforgettable summer of music featuring performances from international and local artists. This festival brings together music lovers from around the world for three days of non-stop entertainment.",
    category: "Music",
    location: "Central Park",
    city: "New York",
    status: "published",
    visibility: "public",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 259200000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer_id: "org_1",
    cover_image_url: "/placeholder.svg?height=400&width=600",
    banner_image_url: "/placeholder.svg?height=400&width=1200",
    slug: "summer-music-festival",
    minimum_price: 50,
    currency: "USD",
    dates: [
      {
        id: "date_1",
        starts_at: new Date(Date.now() + 86400000).toISOString(),
        ends_at: new Date(Date.now() + 172800000).toISOString(),
        timezone: "America/New_York",
        is_primary: true,
      },
    ],
    tickets_available: 1000,
    tickets_sold: 250,
    ticket_types: [
      {
        id: "ticket_1",
        name: "General Admission",
        description: "Access to all stages and areas",
        price: 50,
        currency: "USD",
        quantity_total: 500,
        quantity_remaining: 300,
      },
      {
        id: "ticket_2",
        name: "VIP Pass",
        description: "Premium seating and exclusive access",
        price: 150,
        currency: "USD",
        quantity_total: 200,
        quantity_remaining: 75,
      },
    ],
    venue: {
      id: "venue_1",
      name: "Central Park Amphitheater",
      address_line1: "Central Park",
      city: "New York",
      country: "United States",
      capacity: 5000,
      description: "Open-air amphitheater in the heart of Central Park",
    },
    artists: [
      {
        id: "artist_1",
        name: "The Harmonics",
        bio: "Award-winning rock band",
        image_url: "/placeholder.svg?height=200&width=200&text=TH",
      },
      {
        id: "artist_2",
        name: "Luna Martinez",
        bio: "Rising pop sensation with chart-topping hits",
        image_url: "/placeholder.svg?height=200&width=200&text=LM",
      },
      {
        id: "artist_3",
        name: "The Jazz Collective",
        bio: "Contemporary jazz ensemble",
        image_url: "/placeholder.svg?height=200&width=200&text=JC",
      },
      {
        id: "artist_4",
        name: "Sarah Johnson",
        bio: "Award-winning indie folk artist",
        image_url: "/placeholder.svg?height=200&width=200&text=SJ",
      },
    ],
  },
  "2": {
    id: "2",
    title: "Tech Conference 2024",
    description: "Latest innovations in technology",
    full_description:
      "Discover the future of technology with industry leaders and innovators. Learn about AI, cloud computing, and emerging technologies shaping tomorrow.",
    category: "Technology",
    location: "Moscone Center",
    city: "San Francisco",
    status: "published",
    visibility: "public",
    starts_at: new Date(Date.now() + 172800000).toISOString(),
    ends_at: new Date(Date.now() + 259200000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer_id: "org_2",
    cover_image_url: "/placeholder.svg?height=400&width=600",
    banner_image_url: "/placeholder.svg?height=400&width=1200",
    slug: "tech-conference-2024",
    minimum_price: 100,
    currency: "USD",
    dates: [
      {
        id: "date_2",
        starts_at: new Date(Date.now() + 172800000).toISOString(),
        ends_at: new Date(Date.now() + 345600000).toISOString(),
        timezone: "America/Los_Angeles",
        is_primary: true,
      },
    ],
    tickets_available: 2000,
    tickets_sold: 500,
    ticket_types: [
      {
        id: "ticket_3",
        name: "Standard Pass",
        description: "Full conference access",
        price: 100,
        currency: "USD",
        quantity_total: 1500,
        quantity_remaining: 1200,
      },
    ],
    venue: {
      id: "venue_2",
      name: "Moscone Center",
      address_line1: "800 Howard St",
      city: "San Francisco",
      country: "United States",
      capacity: 3000,
      description: "Premier convention center in downtown San Francisco",
    },
    artists: [
      {
        id: "speaker_1",
        name: "Dr. Michael Chen",
        bio: "AI researcher and keynote speaker on machine learning innovations",
        image_url: "/placeholder.svg?height=200&width=200&text=MC",
      },
      {
        id: "speaker_2",
        name: "Emily Rodriguez",
        bio: "Tech entrepreneur and founder of multiple successful startups",
        image_url: "/placeholder.svg?height=200&width=200&text=ER",
      },
      {
        id: "speaker_3",
        name: "James Patterson",
        bio: "Cloud computing expert and author",
        image_url: "/placeholder.svg?height=200&width=200&text=JP",
      },
    ],
  },
  "3": {
    id: "3",
    title: "Comedy Night Live",
    description: "Stand-up comedy from renowned comedians",
    full_description:
      "Laugh the night away with performances from some of the funniest comedians in the industry. Featuring a diverse lineup of established and up-and-coming talent.",
    category: "Comedy",
    location: "Comedy Store",
    city: "Los Angeles",
    status: "published",
    visibility: "public",
    starts_at: new Date(Date.now() + 259200000).toISOString(),
    ends_at: new Date(Date.now() + 345600000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    organizer_id: "org_3",
    cover_image_url: "/placeholder.svg?height=400&width=600",
    banner_image_url: "/placeholder.svg?height=400&width=1200",
    slug: "comedy-night-live",
    minimum_price: 35,
    currency: "USD",
    dates: [
      {
        id: "date_3",
        starts_at: new Date(Date.now() + 259200000).toISOString(),
        ends_at: new Date(Date.now() + 345600000).toISOString(),
        timezone: "America/Los_Angeles",
        is_primary: true,
      },
    ],
    tickets_available: 500,
    tickets_sold: 180,
    ticket_types: [
      {
        id: "ticket_4",
        name: "Standard Seat",
        price: 35,
        currency: "USD",
        quantity_total: 300,
        quantity_remaining: 150,
      },
      {
        id: "ticket_5",
        name: "Front Row",
        price: 75,
        currency: "USD",
        quantity_total: 100,
        quantity_remaining: 40,
      },
    ],
    venue: {
      id: "venue_3",
      name: "Comedy Store",
      address_line1: "8433 Sunset Blvd",
      city: "Los Angeles",
      country: "United States",
      capacity: 400,
      description: "Iconic comedy club on the Sunset Strip",
    },
    artists: [],
  },
}

async function fetchEventsFromServer(filters?: { category?: string; search?: string }): Promise<EventSummary[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[v0] Supabase not configured, using mock data")
    return MOCK_EVENTS
  }

  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Failed to create Supabase client, falling back to mock data")
    return MOCK_EVENTS
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
    console.error("[v0] Failed to load events from Supabase:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to load events. Please try again later.")
  }

  return (data ?? []).map((event) => mapToSummary(event as RawEvent))
}

export const getAllEvents = cache(async (filters?: { category?: string; search?: string }) => {
  return fetchEventsFromServer(filters)
})

export const getEventById = cache(async (id: string): Promise<EventDetail | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[v0] Supabase not configured, returning mock event data")
    return MOCK_EVENTS_DETAIL[id] ?? null
  }

  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Failed to create Supabase client for event detail")
    return MOCK_EVENTS_DETAIL[id] ?? null
  }

  const { data, error } = await supabase.from("events").select("*").eq("id", id).single()

  if (error && error.code !== "PGRST116") {
    console.error("[v0] Failed to fetch event:", {
      code: error.code,
      message: error.message,
    })
    throw new Error("Unable to load event details")
  }

  if (!data) {
    return null
  }

  return mapToDetail(data as RawEvent)
})

export const getEventBySlug = cache(async (slug: string): Promise<EventDetail | null> => {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase.from("events").select("*").eq("slug", slug).single()

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
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn("[v0] Supabase not configured, returning mock organizer event metrics")
    // Return mock data for demo mode
    return MOCK_EVENTS.map((event) => ({
      id: event.id,
      title: event.title,
      status: "published" as const,
      ticketsAvailable: 500,
      ticketsSold: 120,
      ticketTypes: [],
      startsAt: event.starts_at,
      endsAt: event.starts_at,
      minimumPrice: event.minimum_price,
    }))
  }

  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Failed to create Supabase client, returning mock organizer event metrics")
    return MOCK_EVENTS.map((event) => ({
      id: event.id,
      title: event.title,
      status: "published" as const,
      ticketsAvailable: 500,
      ticketsSold: 120,
      ticketTypes: [],
      startsAt: event.starts_at,
      endsAt: event.starts_at,
      minimumPrice: event.minimum_price,
    }))
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
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
