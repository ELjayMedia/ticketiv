"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createPublicSupabaseClient } from "@/lib/supabase-public"
import { discoveryEventEndCutoffIso } from "@/lib/events/discovery-window"
import { mapDiscoverEvent, type DiscoverEvent } from "@/lib/mappers/discover"
import type { EventsPublicView } from "@/lib/schemas/views"

/**
 * "From who you follow" on Discover. Discover is cached and public, so this
 * runs after it loads, for the signed-in viewer only: upcoming public events
 * from organisers they follow and events featuring artists they follow.
 */

export interface FollowingEvent extends DiscoverEvent {
  /** Why it's here, e.g. "Sunset Collective" or "DJ Nala is playing". */
  reason: string
}

export interface FollowingFeed {
  signedIn: boolean
  /** Follows anyone at all, so an empty feed can say "nothing announced yet". */
  followsSomeone: boolean
  events: FollowingEvent[]
}

const LIMIT = 8

// The follow tables are newer than the generated Database types.
type Loose = any

export async function getFollowingEventsAction(): Promise<FollowingFeed> {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return { signedIn: false, followsSomeone: false, events: [] }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return { signedIn: false, followsSomeone: false, events: [] }

  const [orgRes, artistRes] = await Promise.all([
    supabase.from("org_follows").select("org_id").eq("user_id", user.id).limit(100),
    supabase.from("artist_follows").select("artist_id, artists(name)").eq("user_id", user.id).limit(100),
  ])
  if (orgRes.error) console.error("[following] orgs:", orgRes.error)
  if (artistRes.error) console.error("[following] artists:", artistRes.error)

  const orgIds = ((orgRes.data ?? []) as Array<{ org_id: string }>).map((r) => r.org_id)
  const artists = ((artistRes.data ?? []) as Array<{ artist_id: string; artists: { name: string | null } | null }>).map((r) => ({
    id: r.artist_id,
    name: r.artists?.name ?? "An artist you follow",
  }))
  const followsSomeone = orgIds.length + artists.length > 0
  if (!followsSomeone) return { signedIn: true, followsSomeone, events: [] }

  const pub = createPublicSupabaseClient() as Loose
  if (!pub) return { signedIn: true, followsSomeone, events: [] }

  // Which events feature a followed artist (lineups are public).
  const artistByEvent = new Map<string, string>()
  if (artists.length > 0) {
    const names = new Map(artists.map((a) => [a.id, a.name]))
    const { data, error } = await pub
      .from("event_artists")
      .select("event_id, artist_id")
      .in(
        "artist_id",
        artists.map((a) => a.id),
      )
      .limit(500)
    if (error) console.error("[following] lineups:", error)
    for (const row of (data ?? []) as Array<{ event_id: string; artist_id: string }>) {
      if (!artistByEvent.has(row.event_id)) artistByEvent.set(row.event_id, names.get(row.artist_id) ?? "An artist you follow")
    }
  }

  const eventIds = [...artistByEvent.keys()].slice(0, 200)
  const filters = [
    orgIds.length > 0 ? `organizer_id.in.(${orgIds.join(",")})` : null,
    eventIds.length > 0 ? `id.in.(${eventIds.join(",")})` : null,
  ].filter(Boolean)
  if (filters.length === 0) return { signedIn: true, followsSomeone, events: [] }

  const now = Date.now()
  const { data: cards, error } = await pub
    .from("v_public_event_cards")
    .select("*")
    .or(filters.join(","))
    .or(`event_ends_at.is.null,event_ends_at.gte.${discoveryEventEndCutoffIso(now)}`)
    .order("starts_at", { ascending: true })
    .limit(LIMIT)
  if (error) {
    console.error("[following] cards:", error)
    return { signedIn: true, followsSomeone, events: [] }
  }

  const followedOrgs = new Set(orgIds)
  const events = ((cards ?? []) as EventsPublicView[]).map((row) => {
    const artistName = artistByEvent.get(row.id)
    const reason =
      row.organizer_id && followedOrgs.has(row.organizer_id)
        ? (row.organizer_name ?? "An organiser you follow")
        : `${artistName ?? "An artist you follow"} is playing`
    return { ...mapDiscoverEvent(row), reason }
  })
  return { signedIn: true, followsSomeone, events }
}
