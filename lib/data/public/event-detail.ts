"use server"

import { createClient } from "@/lib/supabase/server"

export type EventDetailTicketType = {
  id: string
  name: string
  price_cents: number
  currency: string
  quota: number | null
  per_user_limit: number | null
  is_reserved_seating: boolean
  sold_count: number
}

export type EventDetailArtist = {
  role: string | null
  id: string
  name: string
  bio: string | null
  slug: string | null
  image_url: string | null
}

export type EventDetailSeries = {
  id: string
  slug: string
  title: string
  series_type: "tour" | "recurring" | "season"
}

export type EventDetailData = {
  id: string
  title: string
  slug: string
  status: string
  starts_at: string | null
  ends_at: string | null
  tz: string
  cover_image_url: string | null
  category: string | null
  city: string | null
  country_code: string | null
  org_id: string
  description: string | null
  is_favourited: boolean
  event_format: "single_day" | "multi_day"
  series: EventDetailSeries | null
  venue: {
    id: string
    name: string
    address: string | null
    city: string | null
    slug: string | null
    capacity: number | null
  } | null
  organization: {
    id: string
    name: string
    slug: string
    bio: string | null
    logo: string | null
  } | null
  ticket_types: EventDetailTicketType[]
  artists: EventDetailArtist[]
  buyer_count: number
  friends_going: Array<{
    user_id: string
    display_name: string | null
  }>
}

export async function getEventDetailById(id: string): Promise<EventDetailData | null> {
  const supabase = await createClient()

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(`
      id, title, slug, status, starts_at, ends_at, tz,
      cover_image_url, category, city, country_code, org_id, description,
      event_format, series_id,
      venue:venue_id(id, name, address, city, slug, capacity),
      organization:org_id(id, name, slug, bio, logo),
      series:series_id(id, slug, title, series_type),
      ticket_types(id, name, price_cents, currency, quota, per_user_limit, is_reserved_seating),
      event_artists(role, artist:artist_id(id, name, bio, slug, image_url))
    `)
    .eq("id", id)
    .single()

  if (eventError || !event) return null

  const ticketTypeIds = ((event.ticket_types as unknown as Array<{ id: string }>) ?? []).map((t) => t.id)

  // Fetch sold counts and auth user in parallel
  const [soldItemsResult, { data: authData }] = await Promise.all([
    ticketTypeIds.length > 0
      ? supabase
          .from("order_items")
          .select("ticket_type_id, order_id")
          .in("ticket_type_id", ticketTypeIds)
      : Promise.resolve({ data: [] as Array<{ ticket_type_id: string; order_id: string }>, error: null }),
    supabase.auth.getUser(),
  ])

  // Compute sold counts (cross-reference with paid orders)
  const soldItems = (soldItemsResult.data ?? []) as Array<{ ticket_type_id: string; order_id: string }>
  const uniqueOrderIds = [...new Set(soldItems.map((i) => i.order_id))]

  let paidOrderIds = new Set<string>()
  let buyerCount = 0

  if (uniqueOrderIds.length > 0) {
    const { data: paidOrders } = await supabase
      .from("orders")
      .select("id, buyer_id")
      .in("id", uniqueOrderIds)
      .eq("status", "paid")

    if (paidOrders) {
      for (const o of paidOrders) paidOrderIds.add(o.id)
      buyerCount = new Set(paidOrders.map((o) => o.buyer_id)).size
    }
  }

  const soldCounts: Record<string, number> = {}
  for (const item of soldItems) {
    if (paidOrderIds.has(item.order_id)) {
      soldCounts[item.ticket_type_id] = (soldCounts[item.ticket_type_id] ?? 0) + 1
    }
  }

  // Check if current user has favourited this event + load friends going
  let isFavourited = false
  let friendsGoing: Array<{ user_id: string; display_name: string | null }> = []
  const user = authData?.user

  if (user) {
    const { data: fav } = await supabase
      .from("event_favourites")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", id)
      .maybeSingle()
    isFavourited = fav != null
  }

  if (user && ticketTypeIds.length > 0) {
    const { data: myFriends } = await supabase.from("user_friends").select("friend_id")

    if (myFriends && myFriends.length > 0) {
      const friendIds = myFriends.map((f) => f.friend_id as string)

      // Find which paid orders were placed by friends
      const friendPaidBuyerIds = new Set<string>()
      if (paidOrderIds.size > 0) {
        const { data: friendOrders } = await supabase
          .from("orders")
          .select("id, buyer_id")
          .in("id", [...paidOrderIds])
          .in("buyer_id", friendIds)

        for (const o of friendOrders ?? []) friendPaidBuyerIds.add(o.buyer_id)
      }

      if (friendPaidBuyerIds.size > 0) {
        const { data: friendProfiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", [...friendPaidBuyerIds])
          .limit(5)

        friendsGoing = (friendProfiles ?? []).map((p) => ({
          user_id: p.user_id as string,
          display_name: p.display_name as string | null,
        }))
      }
    }
  }

  type RawVenue = { id: string; name: string; address: string | null; city: string | null; slug: string | null; capacity: number | null } | null
  type RawOrg = { id: string; name: string; slug: string; bio: string | null; logo: string | null } | null
  type RawTicketType = { id: string; name: string; price_cents: number; currency: string; quota: number | null; per_user_limit: number | null; is_reserved_seating: boolean }
  type RawEventArtist = { role: string | null; artist: { id: string; name: string; bio: string | null; slug: string | null; image_url: string | null } | null }
  type RawSeries = { id: string; slug: string; title: string; series_type: "tour" | "recurring" | "season" } | null

  const venue = event.venue as unknown as RawVenue
  const organization = event.organization as unknown as RawOrg
  const rawTicketTypes = (event.ticket_types as unknown as RawTicketType[]) ?? []
  const rawArtists = (event.event_artists as unknown as RawEventArtist[]) ?? []
  const rawSeries = (event as unknown as { series: RawSeries }).series ?? null
  const eventFormat = (event as unknown as { event_format?: string }).event_format === "multi_day" ? "multi_day" : "single_day"

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    status: event.status,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    tz: event.tz ?? "Africa/Mbabane",
    cover_image_url: event.cover_image_url,
    description: (event as unknown as { description: string | null }).description ?? null,
    category: event.category,
    city: event.city,
    country_code: event.country_code,
    org_id: event.org_id,
    is_favourited: isFavourited,
    event_format: eventFormat,
    series: rawSeries
      ? {
          id: rawSeries.id,
          slug: rawSeries.slug,
          title: rawSeries.title,
          series_type: rawSeries.series_type,
        }
      : null,
    venue: venue
      ? {
          id: venue.id,
          name: venue.name,
          address: venue.address,
          city: venue.city,
          slug: venue.slug,
          capacity: venue.capacity,
        }
      : null,
    organization: organization
      ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          bio: organization.bio,
          logo: organization.logo,
        }
      : null,
    ticket_types: rawTicketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      price_cents: t.price_cents,
      currency: t.currency,
      quota: t.quota,
      per_user_limit: t.per_user_limit,
      is_reserved_seating: t.is_reserved_seating,
      sold_count: soldCounts[t.id] ?? 0,
    })),
    artists: rawArtists
      .filter((ea) => ea.artist != null)
      .map((ea) => ({
        role: ea.role,
        id: ea.artist!.id,
        name: ea.artist!.name,
        bio: ea.artist!.bio,
        slug: ea.artist!.slug,
        image_url: ea.artist!.image_url,
      })),
    buyer_count: buyerCount,
    friends_going: friendsGoing,
  }
}
