// Event memory (Event Companion release 3): the attendee's own rating, the
// organiser's highlights, following the organiser, and "because you went".
// Reads are RLS-scoped; writes go through organiser- or user-checked RPCs.

import { eventTimeZone, formatEventDate, formatTimeRange } from "@ticketiv/shared"

import { createPublicSupabaseClient } from "@/lib/supabase-public"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// The tables and RPCs are newer than the generated Database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (table: string) => any; rpc: (fn: string, args: Record<string, unknown>) => any }
const loose = (client: unknown) => client as Loose

export interface MyFeedback {
  rating: number
  comment: string | null
}

export interface EventHighlight {
  id: string
  imageUrl: string
  caption: string | null
}

export interface SuggestedEvent {
  id: string
  slug: string
  title: string
  whenLabel: string
  photo: string | null
  reason: string
}

export interface FeedbackSummary {
  count: number
  average: number | null
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>
  comments: Array<{ rating: number; comment: string; at: string }>
}

export async function getMyFeedback(eventId: string): Promise<MyFeedback | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  const { data, error } = await loose(supabase).from("event_feedback").select("rating, comment").eq("event_id", eventId).maybeSingle()
  if (error) console.error("[memory] own feedback:", error)
  return data ? { rating: data.rating, comment: data.comment ?? null } : null
}

export async function getEventHighlights(eventId: string): Promise<EventHighlight[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []
  const { data, error } = await loose(supabase)
    .from("event_highlights")
    .select("id, image_url, caption")
    .eq("event_id", eventId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(12)
  if (error) console.error("[memory] highlights:", error)
  return ((data ?? []) as Array<{ id: string; image_url: string; caption: string | null }>).map((h) => ({ id: h.id, imageUrl: h.image_url, caption: h.caption }))
}

export async function isFollowingOrg(orgId: string | null): Promise<boolean> {
  if (!orgId) return false
  const supabase = await createServerSupabaseClient()
  if (!supabase) return false
  const { data } = await loose(supabase).from("org_follows").select("org_id").eq("org_id", orgId).maybeSingle()
  return Boolean(data)
}

type CardRow = { id: string; slug: string; title: string; starts_at: string | null; poster_url: string | null; venue_tz: string | null; organizer_id: string | null }

/**
 * Up to three upcoming public events: more from the same organiser first,
 * then events with an artist from this one. No sales or popularity signals.
 */
export async function getBecauseYouWent(eventId: string, orgId: string | null, orgName: string | null): Promise<SuggestedEvent[]> {
  const supabase = createPublicSupabaseClient()
  if (!supabase) return []
  const db = loose(supabase)
  const nowIso = new Date().toISOString()
  const columns = "id, slug, title, starts_at, poster_url, venue_tz, organizer_id"

  const [sameOrgRes, artistsRes] = await Promise.all([
    orgId
      ? db.from("v_public_event_cards").select(columns).eq("organizer_id", orgId).neq("id", eventId).gt("starts_at", nowIso).order("starts_at").limit(3)
      : Promise.resolve({ data: [] }),
    db.from("event_artists").select("artist_id").eq("event_id", eventId).limit(10),
  ])

  const picked = new Map<string, SuggestedEvent>()
  const add = (row: CardRow, reason: string) => {
    if (picked.has(row.id) || row.id === eventId || picked.size >= 3) return
    const tz = eventTimeZone(row.venue_tz)
    picked.set(row.id, {
      id: row.id,
      slug: row.slug,
      title: row.title,
      whenLabel: row.starts_at ? `${formatEventDate(row.starts_at, null, tz).toUpperCase()} · ${formatTimeRange(row.starts_at, null, tz)}` : "DATE TBA",
      photo: row.poster_url,
      reason,
    })
  }
  for (const row of (sameOrgRes.data ?? []) as CardRow[]) add(row, orgName ? `More from ${orgName}` : "Same organiser")

  const artistIds = ((artistsRes.data ?? []) as Array<{ artist_id: string }>).map((a) => a.artist_id)
  if (picked.size < 3 && artistIds.length) {
    const { data: links } = await db.from("event_artists").select("event_id").in("artist_id", artistIds).neq("event_id", eventId).limit(30)
    const ids = Array.from(new Set(((links ?? []) as Array<{ event_id: string }>).map((l) => l.event_id)))
    if (ids.length) {
      const { data: rows } = await db.from("v_public_event_cards").select(columns).in("id", ids).gt("starts_at", nowIso).order("starts_at").limit(3)
      for (const row of (rows ?? []) as CardRow[]) add(row, "An artist you saw")
    }
  }
  return Array.from(picked.values())
}

export function parseFeedbackSummary(raw: unknown): FeedbackSummary {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}
  const dist = r.distribution && typeof r.distribution === "object" ? (r.distribution as Record<string, unknown>) : {}
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0)
  return {
    count: n(r.count),
    average: r.average === null || r.average === undefined ? null : n(r.average),
    distribution: { "1": n(dist["1"]), "2": n(dist["2"]), "3": n(dist["3"]), "4": n(dist["4"]), "5": n(dist["5"]) },
    comments: (Array.isArray(r.comments) ? r.comments : [])
      .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}))
      .filter((c) => typeof c.comment === "string" && c.comment)
      .map((c) => ({ rating: n(c.rating), comment: String(c.comment), at: String(c.at ?? "") })),
  }
}

/** Organiser view (anonymous), via the organiser-checked RPC. */
export async function getFeedbackSummary(eventId: string): Promise<FeedbackSummary | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  const { data, error } = await loose(supabase).rpc("fn_event_feedback_summary", { p_event_id: eventId })
  if (error) {
    console.error("[memory] feedback summary:", error)
    return null
  }
  return parseFeedbackSummary(data)
}
