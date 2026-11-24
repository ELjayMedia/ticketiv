import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { UUID_RE } from "@/lib/venues/core"

// The marketplace tables are newer than the generated Database types.
type Loose = any

export interface VenueSpace {
  id: string
  venueId: string
  name: string
  description: string | null
  capacityStanding: number | null
  capacitySeated: number | null
  amenities: string[]
  accessibility: string[]
  imageUrls: string[]
  rateCents: number | null
  rateCurrency: string
  rateUnit: string | null
  rateNote: string | null
  isPublic: boolean
}

const SPACE_COLUMNS =
  "id, venue_id, name, description, capacity_standing, capacity_seated, amenities, accessibility, image_urls, rate_cents, rate_currency, rate_unit, rate_note, is_public"

function mapSpace(r: Loose): VenueSpace {
  return {
    id: r.id,
    venueId: r.venue_id,
    name: r.name,
    description: r.description,
    capacityStanding: r.capacity_standing,
    capacitySeated: r.capacity_seated,
    amenities: r.amenities ?? [],
    accessibility: r.accessibility ?? [],
    imageUrls: r.image_urls ?? [],
    rateCents: r.rate_cents,
    rateCurrency: r.rate_currency ?? "SZL",
    rateUnit: r.rate_unit,
    rateNote: r.rate_note,
    isPublic: Boolean(r.is_public),
  }
}

function client(): Loose | null {
  return createServerSupabaseClient() as Loose
}

/** Spaces the caller can see: every space for venue members, public ones of verified venues for everyone else (RLS). */
export async function getVenueSpaces(venueId: string): Promise<VenueSpace[]> {
  const supabase = client()
  if (!supabase || !UUID_RE.test(venueId)) return []
  const { data } = await supabase.from("venue_spaces").select(SPACE_COLUMNS).eq("venue_id", venueId).order("sort_order")
  return (data ?? []).map(mapSpace)
}

export interface VenueBlock {
  id: string
  spaceId: string | null
  startsAt: string
  endsAt: string
  note: string | null
}

export interface VenueBooking {
  id: string
  spaceId: string | null
  enquiryId: string | null
  orgId: string
  orgName: string | null
  eventId: string | null
  startsAt: string
  endsAt: string
  status: "confirmed" | "cancelled"
}

export interface VenueCalendarEvent {
  id: string
  title: string
  slug: string | null
  startsAt: string
  endsAt: string | null
}

export interface VenueCalendar {
  blocks: VenueBlock[]
  bookings: VenueBooking[]
  events: VenueCalendarEvent[]
}

/** Blocks, bookings and public events at the venue between two instants (members only, via RLS). */
export async function getVenueCalendar(venueId: string, fromIso: string, toIso: string): Promise<VenueCalendar> {
  const supabase = client()
  if (!supabase || !UUID_RE.test(venueId)) return { blocks: [], bookings: [], events: [] }
  const [blocksRes, bookingsRes, eventsRes] = await Promise.all([
    supabase.from("venue_blocks").select("id, space_id, starts_at, ends_at, note").eq("venue_id", venueId).lt("starts_at", toIso).gt("ends_at", fromIso).order("starts_at"),
    supabase
      .from("venue_bookings")
      .select("id, space_id, enquiry_id, org_id, org_name, event_id, starts_at, ends_at, status")
      .eq("venue_id", venueId)
      .lt("starts_at", toIso)
      .gt("ends_at", fromIso)
      .order("starts_at"),
    supabase
      .from("events")
      .select("id, title, slug, starts_at, ends_at")
      .eq("venue_id", venueId)
      .eq("status", "published")
      .is("cancelled_at", null)
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso)
      .order("starts_at"),
  ])
  return {
    blocks: (blocksRes.data ?? []).map((b: Loose) => ({ id: b.id, spaceId: b.space_id, startsAt: b.starts_at, endsAt: b.ends_at, note: b.note })),
    bookings: (bookingsRes.data ?? []).map((b: Loose) => ({
      id: b.id,
      spaceId: b.space_id,
      enquiryId: b.enquiry_id,
      orgId: b.org_id,
      orgName: b.org_name ?? null,
      eventId: b.event_id,
      startsAt: b.starts_at,
      endsAt: b.ends_at,
      status: b.status,
    })),
    events: (eventsRes.data ?? []).map((e: Loose) => ({ id: e.id, title: e.title, slug: e.slug, startsAt: e.starts_at, endsAt: e.ends_at })),
  }
}

export interface EnquirySummary {
  id: string
  venueId: string
  venueName: string | null
  venueSlug: string | null
  spaceId: string | null
  spaceName: string | null
  orgId: string
  orgName: string | null
  startsAt: string
  endsAt: string
  expectedAttendance: number | null
  budgetCents: number | null
  currency: string
  status: string
  decisionNote: string | null
  createdAt: string
  updatedAt: string
}

export interface EnquiryMessage {
  id: string
  side: "venue" | "organizer"
  body: string
  createdAt: string
  mine: boolean
}

export interface EnquiryDetail extends EnquirySummary {
  messages: EnquiryMessage[]
  booking: { id: string; status: string; eventId: string | null } | null
}

const ENQUIRY_COLUMNS =
  "id, venue_id, space_id, org_id, starts_at, ends_at, expected_attendance, budget_cents, currency, status, decision_note, created_at, updated_at, org_name, venues(name, slug), venue_spaces(name)"

function mapEnquiry(e: Loose): EnquirySummary {
  return {
    id: e.id,
    venueId: e.venue_id,
    venueName: e.venues?.name ?? null,
    venueSlug: e.venues?.slug ?? null,
    spaceId: e.space_id,
    spaceName: e.venue_spaces?.name ?? null,
    orgId: e.org_id,
    orgName: e.org_name ?? null,
    startsAt: e.starts_at,
    endsAt: e.ends_at,
    expectedAttendance: e.expected_attendance,
    budgetCents: e.budget_cents,
    currency: e.currency ?? "SZL",
    status: e.status,
    decisionNote: e.decision_note,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }
}

export async function listEnquiries(filter: { venueId?: string; orgId?: string }): Promise<EnquirySummary[]> {
  const supabase = client()
  if (!supabase) return []
  let q = supabase.from("venue_enquiries").select(ENQUIRY_COLUMNS).order("updated_at", { ascending: false }).limit(200)
  if (filter.venueId) {
    if (!UUID_RE.test(filter.venueId)) return []
    q = q.eq("venue_id", filter.venueId)
  }
  if (filter.orgId) {
    if (!UUID_RE.test(filter.orgId)) return []
    q = q.eq("org_id", filter.orgId)
  }
  const { data } = await q
  return (data ?? []).map(mapEnquiry)
}

/** One enquiry and its thread, or null when the caller isn't a party (RLS). */
export async function getEnquiry(enquiryId: string): Promise<EnquiryDetail | null> {
  const supabase = client()
  if (!supabase || !UUID_RE.test(enquiryId)) return null
  const [{ data: e }, { data: messages }, { data: booking }, { data: userRes }] = await Promise.all([
    supabase.from("venue_enquiries").select(ENQUIRY_COLUMNS).eq("id", enquiryId).maybeSingle(),
    supabase.from("venue_enquiry_messages").select("id, side, body, created_at, author_id").eq("enquiry_id", enquiryId).order("created_at"),
    supabase.from("venue_bookings").select("id, status, event_id").eq("enquiry_id", enquiryId).maybeSingle(),
    supabase.auth.getUser(),
  ])
  if (!e) return null
  const me = userRes?.user?.id ?? null
  return {
    ...mapEnquiry(e),
    messages: (messages ?? []).map((m: Loose) => ({ id: m.id, side: m.side, body: m.body, createdAt: m.created_at, mine: Boolean(me && m.author_id === me) })),
    booking: booking ? { id: booking.id, status: booking.status, eventId: booking.event_id } : null,
  }
}

/** Organisations the signed-in user manages (owner/admin), for the enquiry form. */
export async function getMyManagedOrgs(): Promise<Array<{ id: string; name: string }>> {
  const supabase = client()
  if (!supabase) return []
  const { data: userRes } = await supabase.auth.getUser()
  const user = userRes?.user
  if (!user || user.is_anonymous) return []
  const { data } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id)
    .in("role", ["organizer_owner", "organizer_admin", "organizer", "admin"])
  return (data ?? [])
    .filter((r: Loose) => r.organizations?.name)
    .map((r: Loose) => ({ id: r.org_id, name: r.organizations.name }))
}

export interface VenueSearchResult {
  id: string
  name: string
  slug: string
  city: string | null
  venueType: string | null
  capacity: number | null
  spaceCount: number
  available: boolean | null
}

export async function searchVenues(params: {
  city?: string | null
  minCapacity?: number | null
  maxCapacity?: number | null
  venueType?: string | null
  date?: string | null
}): Promise<VenueSearchResult[]> {
  const supabase = client()
  if (!supabase) return []
  const { data, error } = await supabase.rpc("fn_search_venues", {
    p_city: params.city || null,
    p_min_capacity: params.minCapacity ?? null,
    p_max_capacity: params.maxCapacity ?? null,
    p_venue_type: params.venueType || null,
    p_date: params.date || null,
  })
  if (error) return []
  return (data ?? []).map((r: Loose) => ({
    id: r.id,
    name: r.name,
    slug: r.slug,
    city: r.city,
    venueType: r.venue_type,
    capacity: r.capacity,
    spaceCount: r.space_count ?? 0,
    available: typeof r.available === "boolean" ? r.available : null,
  }))
}
