import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getPublishedEvents(limit = 20, offset = 0) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("events")
    .select(`
      id,
      title,
      slug,
      description,
      cover_image_url,
      category,
      venue:venues(name, city),
      ticket_types(price)
    `)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("starts_at", { ascending: true })
    .range(offset, offset + limit - 1)

  return data || []
}

export async function getEventBySlug(slug: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data } = await supabase
    .from("events")
    .select(`
      id,
      title,
      description,
      full_description,
      cover_image_url,
      banner_image_url,
      starts_at,
      ends_at,
      timezone,
      category,
      venue:venues(*),
      ticket_types(*),
      event_artists(artist:artists(*))
    `)
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  return data
}

export async function getOrganizerEvents(orgId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("events")
    .select(`
      id,
      title,
      status,
      starts_at,
      visibility,
      orders(count),
      ticket_types(count)
    `)
    .eq("organizer_id", orgId)
    .order("starts_at", { ascending: false })

  return data || []
}

export async function getEventMetrics(eventId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single()

  const { data: orders = [] } = await supabase.from("orders").select("*").eq("event_id", eventId)

  const { data: scans = [] } = await supabase.from("scans").select("*").eq("event_id", eventId)

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalTicketsSold = orders.length
  const totalCheckIns = scans.length

  return {
    event,
    metrics: {
      totalRevenue,
      totalTicketsSold,
      totalCheckIns,
    },
  }
}

export async function getUserTickets(userId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("order_items")
    .select(`
      id,
      event_id,
      ticket_type_id,
      quantity,
      created_at,
      event:events(title, starts_at),
      ticket_type:ticket_types(name, price)
    `)
    .eq("purchaser_id", userId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getUserPayments(userId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("payments")
    .select(`
      id,
      amount,
      currency,
      status,
      created_at,
      order:orders(id, event_id, events(title))
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getOrgPayouts(orgId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("payouts")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getEventOrders(eventId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("orders")
    .select(`
      id,
      purchaser_email,
      purchaser_first_name,
      purchaser_last_name,
      status,
      total_amount,
      created_at,
      order_items(*)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getEventGuestlist(eventId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("guestlist_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  return data || []
}

export async function getLedgerEntries(eventId: string, limit = 10) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("occurred_at", { ascending: false })
    .limit(limit)

  return data || []
}

export async function getPublishedArtists(limit = 50, offset = 0) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data } = await supabase
    .from("artists")
    .select("*")
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1)

  return data || []
}
