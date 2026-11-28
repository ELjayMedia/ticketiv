import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { parseArtistInsights, type ArtistInsights } from "@/lib/artists/bookings"

type Loose = any
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface BookingSummary {
  id: string
  artistId: string
  artistName: string | null
  orgId: string
  orgName: string | null
  eventId: string | null
  eventTitle: string
  startsAt: string
  city: string | null
  setMinutes: number | null
  offerMinCents: number | null
  offerMaxCents: number | null
  counterCents: number | null
  agreedCents: number | null
  currency: string
  status: string
  updatedAt: string
}

export interface BookingDetail extends BookingSummary {
  messages: Array<{ id: string; side: "artist" | "organizer"; body: string; createdAt: string; mine: boolean }>
}

const COLUMNS =
  "id, artist_id, org_id, org_name, event_id, event_title, starts_at, city, set_minutes, offer_min_cents, offer_max_cents, counter_cents, agreed_cents, currency, status, updated_at, artists(name)"

function map(r: Loose): BookingSummary {
  return {
    id: r.id,
    artistId: r.artist_id,
    artistName: r.artists?.name ?? null,
    orgId: r.org_id,
    orgName: r.org_name,
    eventId: r.event_id,
    eventTitle: r.event_title,
    startsAt: r.starts_at,
    city: r.city,
    setMinutes: r.set_minutes,
    offerMinCents: r.offer_min_cents,
    offerMaxCents: r.offer_max_cents,
    counterCents: r.counter_cents,
    agreedCents: r.agreed_cents,
    currency: r.currency ?? "SZL",
    status: r.status,
    updatedAt: r.updated_at,
  }
}

export async function listBookings(filter: { artistId?: string; orgId?: string }): Promise<BookingSummary[]> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return []
  let q = supabase.from("artist_booking_requests").select(COLUMNS).order("starts_at", { ascending: true }).limit(300)
  if (filter.artistId) {
    if (!UUID.test(filter.artistId)) return []
    q = q.eq("artist_id", filter.artistId)
  }
  if (filter.orgId) {
    if (!UUID.test(filter.orgId)) return []
    q = q.eq("org_id", filter.orgId)
  }
  const { data } = await q
  return (data ?? []).map(map)
}

export async function getBooking(requestId: string): Promise<BookingDetail | null> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase || !UUID.test(requestId)) return null
  const [{ data: r }, { data: messages }, { data: userRes }] = await Promise.all([
    supabase.from("artist_booking_requests").select(COLUMNS).eq("id", requestId).maybeSingle(),
    supabase.from("artist_booking_messages").select("id, side, body, created_at, author_id").eq("request_id", requestId).order("created_at"),
    supabase.auth.getUser(),
  ])
  if (!r) return null
  const me = userRes?.user?.id ?? null
  return {
    ...map(r),
    messages: (messages ?? []).map((m: Loose) => ({ id: m.id, side: m.side, body: m.body, createdAt: m.created_at, mine: Boolean(me && m.author_id === me) })),
  }
}

export async function getArtistInsights(artistId: string): Promise<ArtistInsights | null> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase || !UUID.test(artistId)) return null
  const { data, error } = await supabase.rpc("fn_artist_insights", { p_artist_id: artistId })
  if (error) return null
  return parseArtistInsights(data)
}

/** Upcoming events of an organisation, for linking an accepted booking. */
export async function getOrgUpcomingEvents(orgId: string): Promise<Array<{ id: string; title: string; startsAt: string | null }>> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase || !UUID.test(orgId)) return []
  const { data } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("org_id", orgId)
    .in("status", ["draft", "published", "paused"])
    .or(`starts_at.is.null,starts_at.gte.${new Date().toISOString()}`)
    .order("starts_at", { ascending: true })
    .limit(50)
  return (data ?? []).map((e: Loose) => ({ id: e.id, title: e.title, startsAt: e.starts_at }))
}

/** Upcoming public line-up dates for the artist (the other half of the calendar). */
export async function getArtistLineupDates(artistId: string): Promise<Array<{ id: string; title: string; slug: string | null; startsAt: string }>> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase || !UUID.test(artistId)) return []
  const { data } = await supabase
    .from("event_artists")
    .select("events!inner(id, title, slug, starts_at, status, cancelled_at)")
    .eq("artist_id", artistId)
    .eq("events.status", "published")
    .is("events.cancelled_at", null)
    .gte("events.starts_at", new Date().toISOString())
  return (data ?? [])
    .map((r: Loose) => r.events)
    .filter(Boolean)
    .map((e: Loose) => ({ id: e.id, title: e.title, slug: e.slug, startsAt: e.starts_at }))
    .sort((a: { startsAt: string }, b: { startsAt: string }) => a.startsAt.localeCompare(b.startsAt))
}

export async function getRecentAnnouncements(artistId: string): Promise<Array<{ id: string; title: string; recipients: number; createdAt: string }>> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase || !UUID.test(artistId)) return []
  const { data } = await supabase
    .from("artist_announcements")
    .select("id, title, recipients, created_at")
    .eq("artist_id", artistId)
    .order("created_at", { ascending: false })
    .limit(10)
  return (data ?? []).map((a: Loose) => ({ id: a.id, title: a.title, recipients: a.recipients, createdAt: a.created_at }))
}
