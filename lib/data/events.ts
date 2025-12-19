import { createServerSupabaseClient } from "@/lib/supabase"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_EVENTS, DEMO_VENUES, DEMO_TICKET_TYPES, getDemoEventById } from "@/lib/demo-data"
import type { EventSummary, EventDetail } from "@/types"

export async function getPublicEvents(filters?: {
  q?: string
  city?: string
  category?: string
  from?: string
  to?: string
  page?: number
  limit?: number
}): Promise<EventSummary[]> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession) {
    let events = [...DEMO_EVENTS]

    // Apply filters
    if (filters?.q) {
      const query = filters.q.toLowerCase()
      events = events.filter(
        (e) => e.title.toLowerCase().includes(query) || e.description?.toLowerCase().includes(query),
      )
    }

    if (filters?.category) {
      events = events.filter((e) => e.category === filters.category)
    }

    // Map to EventSummary format
    return events.map((event) => {
      const venue = DEMO_VENUES.find((v) => v.id === event.venue_id)
      const ticketTypes = DEMO_TICKET_TYPES.filter((t) => t.event_id === event.id)
      const minPrice = ticketTypes.length ? Math.min(...ticketTypes.map((t) => t.price_cents)) : null

      return {
        id: event.id,
        slug: event.slug,
        title: event.title,
        summary: event.description,
        description: event.description,
        category: event.category,
        status: event.status as EventSummary["status"],
        currency: "USD",
        cover_image_url: event.cover_image_url,
        venue_name: venue?.name,
        location: venue ? `${venue.city}, ${venue.state}` : null,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        minimum_price: minPrice,
        tickets_available: ticketTypes.reduce((sum, t) => sum + t.quantity_remaining, 0),
        tickets_sold: null,
        organizer_id: event.org_id,
      }
    })
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  let query = supabase
    .from("events")
    .select(
      `
      id,
      slug,
      title,
      summary,
      description,
      category,
      status,
      currency,
      cover_image_url,
      starts_at,
      ends_at,
      organizer_id,
      venue:venues(name, city, region),
      ticket_types(price)
    `,
    )
    .eq("status", "published")
    .eq("visibility", "public")

  if (filters?.q) {
    query = query.ilike("title", `%${filters.q}%`)
  }
  if (filters?.category) {
    query = query.eq("category", filters.category)
  }

  const { data, error } = await query

  if (error) throw error

  return (
    data?.map((event: any) => ({
      id: event.id,
      slug: event.slug,
      title: event.title,
      summary: event.summary,
      description: event.description,
      category: event.category,
      status: event.status,
      currency: event.currency,
      cover_image_url: event.cover_image_url,
      venue_name: event.venue?.name,
      location: event.venue ? `${event.venue.city}, ${event.venue.region}` : null,
      starts_at: event.starts_at,
      ends_at: event.ends_at,
      minimum_price: event.ticket_types?.length ? Math.min(...event.ticket_types.map((t: any) => t.price)) : null,
      tickets_available: null,
      tickets_sold: null,
      organizer_id: event.organizer_id,
    })) || []
  )
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession) {
    const event = DEMO_EVENTS.find((e) => e.slug === slug)
    if (!event) return null

    const demoEvent = getDemoEventById(event.id)
    if (!demoEvent) return null

    return {
      id: demoEvent.id,
      slug: demoEvent.slug,
      title: demoEvent.title,
      summary: demoEvent.description,
      description: demoEvent.description,
      full_description: demoEvent.full_description,
      category: demoEvent.category,
      status: demoEvent.status as EventDetail["status"],
      currency: "USD",
      cover_image_url: demoEvent.cover_image_url,
      banner_image_url: demoEvent.banner_image_url,
      timezone: demoEvent.timezone,
      venue_name: demoEvent.venue?.name,
      location: demoEvent.venue ? `${demoEvent.venue.city}, ${demoEvent.venue.state}` : null,
      starts_at: demoEvent.starts_at,
      ends_at: demoEvent.ends_at,
      minimum_price: demoEvent.ticket_types?.length
        ? Math.min(...demoEvent.ticket_types.map((t) => t.price_cents))
        : null,
      tickets_available: demoEvent.ticket_types?.reduce((sum, t) => sum + t.quantity_remaining, 0),
      tickets_sold: null,
      organizer_id: demoEvent.org_id,
      ticket_types: demoEvent.ticket_types.map((t) => ({
        id: t.id,
        event_id: t.event_id,
        name: t.name,
        description: t.description || null,
        price: t.price_cents,
        currency: t.currency,
        fee_fixed: null,
        fee_percent: null,
        absorb_fees: null,
        quantity_total: t.quantity_total,
        quantity_remaining: t.quantity_remaining,
        sales_start: null,
        sales_end: null,
        metadata: null,
        created_at: t.created_at,
        updated_at: t.created_at,
      })),
      dates: [],
      venue: demoEvent.venue
        ? {
            id: demoEvent.venue.id,
            name: demoEvent.venue.name,
            description: demoEvent.venue.description || null,
            address_line1: demoEvent.venue.address_line1 || null,
            address_line2: null,
            city: demoEvent.venue.city || null,
            region: demoEvent.venue.state || null,
            postal_code: demoEvent.venue.postal_code || null,
            country: demoEvent.venue.country || null,
            latitude: null,
            longitude: null,
            capacity: demoEvent.venue.capacity || null,
            created_at: demoEvent.venue.created_at,
            updated_at: demoEvent.venue.created_at,
          }
        : null,
      artists: demoEvent.artists?.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role || null,
        bio: a.bio || null,
        image_url: a.avatar_url || null,
        avatar_url: a.avatar_url || null,
      })),
    }
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      venue:venues(*),
      ticket_types(*),
      dates:event_dates(*),
      event_artists(
        artist:artists(*)
      )
    `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    description: data.description,
    full_description: data.full_description,
    category: data.category,
    status: data.status,
    currency: data.currency,
    cover_image_url: data.cover_image_url,
    banner_image_url: data.banner_image_url,
    timezone: data.timezone,
    venue_name: data.venue?.name,
    location: data.venue ? `${data.venue.city}, ${data.venue.region}` : null,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    minimum_price: data.ticket_types?.length ? Math.min(...data.ticket_types.map((t: any) => t.price)) : null,
    tickets_available: data.tickets_available,
    tickets_sold: data.tickets_sold,
    organizer_id: data.organizer_id,
    ticket_types: data.ticket_types || [],
    dates: data.dates || [],
    venue: data.venue || null,
    artists: data.event_artists?.map((ea: any) => ({
      id: ea.artist.id,
      name: ea.artist.name,
      role: ea.artist.role,
      bio: ea.artist.bio,
      image_url: ea.artist.avatar_url,
      avatar_url: ea.artist.avatar_url,
    })),
  }
}

export async function getEventById(eventId: string): Promise<EventDetail | null> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession) {
    const demoEvent = getDemoEventById(eventId)
    if (!demoEvent) return null

    return {
      id: demoEvent.id,
      slug: demoEvent.slug,
      title: demoEvent.title,
      summary: demoEvent.description,
      description: demoEvent.description,
      full_description: demoEvent.full_description,
      category: demoEvent.category,
      status: demoEvent.status as EventDetail["status"],
      currency: "USD",
      cover_image_url: demoEvent.cover_image_url,
      banner_image_url: demoEvent.banner_image_url,
      timezone: demoEvent.timezone,
      venue_name: demoEvent.venue?.name,
      location: demoEvent.venue ? `${demoEvent.venue.city}, ${demoEvent.venue.state}` : null,
      starts_at: demoEvent.starts_at,
      ends_at: demoEvent.ends_at,
      minimum_price: demoEvent.ticket_types?.length
        ? Math.min(...demoEvent.ticket_types.map((t) => t.price_cents))
        : null,
      tickets_available: demoEvent.ticket_types?.reduce((sum, t) => sum + t.quantity_remaining, 0),
      tickets_sold: null,
      organizer_id: demoEvent.org_id,
      ticket_types: demoEvent.ticket_types.map((t) => ({
        id: t.id,
        event_id: t.event_id,
        name: t.name,
        description: t.description || null,
        price: t.price_cents,
        currency: t.currency,
        fee_fixed: null,
        fee_percent: null,
        absorb_fees: null,
        quantity_total: t.quantity_total,
        quantity_remaining: t.quantity_remaining,
        sales_start: null,
        sales_end: null,
        metadata: null,
        created_at: t.created_at,
        updated_at: t.created_at,
      })),
      dates: [],
      venue: demoEvent.venue
        ? {
            id: demoEvent.venue.id,
            name: demoEvent.venue.name,
            description: demoEvent.venue.description || null,
            address_line1: demoEvent.venue.address_line1 || null,
            address_line2: null,
            city: demoEvent.venue.city || null,
            region: demoEvent.venue.state || null,
            postal_code: demoEvent.venue.postal_code || null,
            country: demoEvent.venue.country || null,
            latitude: null,
            longitude: null,
            capacity: demoEvent.venue.capacity || null,
            created_at: demoEvent.venue.created_at,
            updated_at: demoEvent.venue.created_at,
          }
        : null,
      artists: demoEvent.artists?.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role || null,
        bio: a.bio || null,
        image_url: a.avatar_url || null,
        avatar_url: a.avatar_url || null,
      })),
    }
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      venue:venues(*),
      ticket_types(*),
      dates:event_dates(*),
      event_artists(
        artist:artists(*)
      )
    `,
    )
    .eq("id", eventId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    summary: data.summary,
    description: data.description,
    full_description: data.full_description,
    category: data.category,
    status: data.status,
    currency: data.currency,
    cover_image_url: data.cover_image_url,
    banner_image_url: data.banner_image_url,
    timezone: data.timezone,
    venue_name: data.venue?.name,
    location: data.venue ? `${data.venue.city}, ${data.venue.region}` : null,
    starts_at: data.starts_at,
    ends_at: data.ends_at,
    minimum_price: data.ticket_types?.length ? Math.min(...data.ticket_types.map((t: any) => t.price)) : null,
    tickets_available: data.tickets_available,
    tickets_sold: data.tickets_sold,
    organizer_id: data.organizer_id,
    ticket_types: data.ticket_types || [],
    dates: data.dates || [],
    venue: data.venue || null,
    artists: data.event_artists?.map((ea: any) => ({
      id: ea.artist.id,
      name: ea.artist.name,
      role: ea.artist.role,
      bio: ea.artist.bio,
      image_url: ea.artist.avatar_url,
      avatar_url: ea.artist.avatar_url,
    })),
  }
}
