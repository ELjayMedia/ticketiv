// Event Companion data: the attendee guide and official updates.
//
// event_guides is public for published events (the event page shows a short
// "Plan your day" strip from it). event_updates is RLS-scoped to ticket
// holders, the organiser's team and platform admins. Writes go through
// SECURITY DEFINER RPCs (fn_save_event_guide, fn_post_event_update,
// fn_hide_event_update); nothing here inserts or updates directly.

import {
  DEFAULT_EVENT_TIME_ZONE,
  cleanFacilities,
  cleanProgramme,
  eventTimeZone,
  formatEventClock,
  type GuideFacility,
  type GuideProgrammeItem,
} from "@ticketiv/shared"

import { getMyTickets } from "@/lib/data/attendee/tickets"
import type { MyTicketsView } from "@/lib/schemas/views"
import { createPublicSupabaseClient } from "@/lib/supabase-public"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// The tables and RPCs are newer than the generated Database types.
type Loose = { from: (table: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any }
const loose = (client: unknown) => client as Loose

export interface EventGuide {
  doorsOpenAt: string | null
  entrance: string | null
  gettingThere: string | null
  parking: string | null
  ageRule: string | null
  paymentNote: string | null
  whatToBring: string | null
  houseRules: string | null
  helpContact: string | null
  programme: GuideProgrammeItem[]
  facilities: GuideFacility[]
  updatedAt: string | null
}

export interface EventUpdate {
  id: string
  title: string
  body: string | null
  notified: boolean
  createdAt: string
  hiddenAt: string | null
  hiddenReason: string | null
}

const GUIDE_COLUMNS =
  "doors_open_at, entrance, getting_there, parking, age_rule, payment_note, what_to_bring, house_rules, help_contact, programme, facilities, updated_at"

export function mapGuide(row: any): EventGuide | null {
  if (!row) return null
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null)
  return {
    doorsOpenAt: text(row.doors_open_at),
    entrance: text(row.entrance),
    gettingThere: text(row.getting_there),
    parking: text(row.parking),
    ageRule: text(row.age_rule),
    paymentNote: text(row.payment_note),
    whatToBring: text(row.what_to_bring),
    houseRules: text(row.house_rules),
    helpContact: text(row.help_contact),
    programme: cleanProgramme(row.programme),
    facilities: cleanFacilities(row.facilities),
    updatedAt: text(row.updated_at),
  }
}

function mapUpdate(row: any): EventUpdate {
  return {
    id: row.id,
    title: row.title,
    body: row.body ?? null,
    notified: Boolean(row.notified),
    createdAt: row.created_at,
    hiddenAt: row.hidden_at ?? null,
    hiddenReason: row.hidden_reason ?? null,
  }
}

/** How much of the guide is filled in, for the organiser checklist and admin. */
export function guideCompleteness(guide: EventGuide | null): { filled: number; total: number; missing: string[] } {
  const checks: Array<[string, boolean]> = [
    ["Doors time", Boolean(guide?.doorsOpenAt)],
    ["Entrance", Boolean(guide?.entrance)],
    ["Getting there", Boolean(guide?.gettingThere)],
    ["Parking", Boolean(guide?.parking)],
    ["Running order", (guide?.programme.length ?? 0) > 0],
    ["Help contact", Boolean(guide?.helpContact)],
  ]
  return {
    filled: checks.filter(([, ok]) => ok).length,
    total: checks.length,
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  }
}

/** Public: the guide for a published event (event page "Plan your day"). */
export async function getPublicEventGuide(eventId: string): Promise<EventGuide | null> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return null
  const { data, error } = await loose(supabase).from("event_guides").select(GUIDE_COLUMNS).eq("event_id", eventId).maybeSingle()
  if (error) {
    console.error("[companion] public guide:", error)
    return null
  }
  return mapGuide(data)
}

export interface CompanionData {
  eventId: string
  title: string
  slug: string
  coverImageUrl: string | null
  venueName: string | null
  venueAddress: string | null
  city: string | null
  startsAt: string | null
  endsAt: string | null
  orgId: string | null
  orgName: string | null
  /** Where the event happens: events.tz, else the venue's, else Eswatini. */
  timeZone: string
  tickets: MyTicketsView[]
  guide: EventGuide | null
  updates: EventUpdate[]
  friendsGoing: Array<{ id: string; name: string }>
}

const LIVE = new Set(["issued", "checked_in"])

/**
 * Everything the signed-in holder's companion shows for one event, or null
 * when they hold no live ticket for it.
 */
export async function getEventCompanion(eventId: string): Promise<CompanionData | null> {
  const tickets = (await getMyTickets()).filter((t) => t.event_id === eventId && LIVE.has(t.order_item_status))
  if (tickets.length === 0) return null

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  const db = loose(supabase)

  const [guideRes, updatesRes, eventRes, friendsRes] = await Promise.all([
    db.from("event_guides").select(GUIDE_COLUMNS).eq("event_id", eventId).maybeSingle(),
    db
      .from("event_updates")
      .select("id, title, body, notified, created_at, hidden_at, hidden_reason")
      .eq("event_id", eventId)
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .limit(10),
    db.from("events").select("org_id, tz, organizations(name), venues(tz)").eq("id", eventId).maybeSingle(),
    db.rpc("fn_my_friends_going", { p_event_ids: [eventId], p_from: null, p_limit: 20 }),
  ])
  if (guideRes.error) console.error("[companion] guide:", guideRes.error)
  if (updatesRes.error) console.error("[companion] updates:", updatesRes.error)
  if (friendsRes.error) console.error("[companion] friends going:", friendsRes.error)

  const first = tickets[0]
  return {
    eventId,
    title: first.event_title,
    slug: first.event_slug,
    coverImageUrl: first.cover_image_url,
    venueName: first.venue_name,
    venueAddress: first.venue_address,
    city: first.city,
    startsAt: first.event_starts_at,
    endsAt: first.event_ends_at ?? null,
    orgId: eventRes.data?.org_id ?? null,
    orgName: eventRes.data?.organizations?.name ?? null,
    timeZone: eventTimeZone(eventRes.data?.tz, eventRes.data?.venues?.tz),
    tickets,
    guide: mapGuide(guideRes.data),
    updates: (updatesRes.data ?? []).map(mapUpdate),
    friendsGoing: ((friendsRes.data ?? []) as Array<{ friend_id: string; friend_name: string | null; friend_handle: string | null }>)
      .filter((f) => f.friend_id)
      .map((f) => ({ id: f.friend_id, name: f.friend_name || (f.friend_handle ? `@${f.friend_handle}` : "A friend") })),
  }
}

/** Organiser: the guide (drafts too) and every update, hidden ones included. */
export async function getOrganizerCompanion(eventId: string): Promise<{ guide: EventGuide | null; updates: EventUpdate[] }> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { guide: null, updates: [] }
  const db = loose(supabase)
  const [guideRes, updatesRes] = await Promise.all([
    db.from("event_guides").select(GUIDE_COLUMNS).eq("event_id", eventId).maybeSingle(),
    db
      .from("event_updates")
      .select("id, title, body, notified, created_at, hidden_at, hidden_reason")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(50),
  ])
  if (guideRes.error) console.error("[companion] organiser guide:", guideRes.error)
  if (updatesRes.error) console.error("[companion] organiser updates:", updatesRes.error)
  return { guide: mapGuide(guideRes.data), updates: (updatesRes.data ?? []).map(mapUpdate) }
}

const clip = (value: string, max = 42) => (value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value)

/**
 * The guide's planning facts for the public event page ("Doors 14:00",
 * "Ages 18+ with ID"). Short values only; the full guide is in the companion.
 */
export function guidePlanFacts(guide: EventGuide | null, timeZone: string = DEFAULT_EVENT_TIME_ZONE): Array<readonly [string, string]> {
  if (!guide) return []
  const facts: Array<readonly [string, string]> = []
  if (guide.doorsOpenAt) {
    const doors = formatEventClock(guide.doorsOpenAt, timeZone)
    facts.push(["Doors", doors])
  }
  if (guide.ageRule) facts.push(["Ages", clip(guide.ageRule)])
  if (guide.parking) facts.push(["Parking", clip(guide.parking)])
  if (guide.paymentNote) facts.push(["Payment", clip(guide.paymentNote)])
  return facts
}
