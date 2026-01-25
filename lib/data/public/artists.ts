"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_ARTISTS, DEMO_EVENTS } from "@/lib/demo-data"

export interface Artist {
  id: string
  name: string
  bio?: string
  avatar_url?: string
  genre?: string
  role?: string
  created_at?: string
}

export interface ArtistDetail extends Artist {
  upcoming_events_count: number
}

/**
 * Get all public artists
 * Reads from: artists table
 */
export async function getPublicArtists(params?: {
  limit?: number
  offset?: number
}): Promise<Artist[]> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return DEMO_ARTISTS.slice(params?.offset || 0, (params?.offset || 0) + (params?.limit || 50))
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("artists")
      .select("id, name, bio, avatar_url, genre, role, created_at")
      .order("name")
      .limit(params?.limit || 50)
      .range(params?.offset || 0, (params?.offset || 0) + (params?.limit || 50) - 1)

    if (error) {
      console.error("[v0] Error fetching public artists:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching public artists:", error)
    return []
  }
}

/**
 * Get artist detail with upcoming events
 * Reads from: artists, event_artists, events
 */
export async function getArtistDetail(artistId: string): Promise<ArtistDetail | null> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const artist = DEMO_ARTISTS.find((a) => a.id === artistId)
    if (!artist) return null

    // Find events this artist is featured in
    const upcomingEvents = DEMO_EVENTS.filter((e) => {
      // This is a simplified check; in real data, check event_artists table
      const isArtistInEvent = [0, 1, 5, 6, 2, 3, 4, 7, 8, 9, 10].includes(DEMO_ARTISTS.indexOf(artist))
      return e.status === "published" && isArtistInEvent && new Date(e.starts_at) > new Date()
    }).length

    return {
      ...artist,
      upcoming_events_count: upcomingEvents,
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data: artist, error: artistError } = await supabase
      .from("artists")
      .select("id, name, bio, avatar_url, genre, role, created_at")
      .eq("id", artistId)
      .maybeSingle()

    if (artistError || !artist) {
      console.error("[v0] Error fetching artist detail:", artistError)
      return null
    }

    // Get upcoming events count
    const { count: upcomingEventsCount } = await supabase
      .from("event_artists")
      .select("id", { count: "exact", head: true })
      .eq("artist_id", artistId)
      .in("event_id", (await supabase
        .from("events")
        .select("id")
        .eq("status", "published")
        .gt("starts_at", new Date().toISOString())).data?.map((e) => e.id) || [])

    return {
      ...artist,
      upcoming_events_count: upcomingEventsCount || 0,
    }
  } catch (error) {
    console.error("[v0] Unexpected error fetching artist detail:", error)
    return null
  }
}

/**
 * Get events featuring an artist
 * Reads from: event_artists, events, v_events_public
 */
export async function getArtistEvents(artistId: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    // Simplified: return events matching demo data
    return DEMO_EVENTS.filter((e) => e.status === "published").sort(
      (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
    )
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    // Get event IDs for this artist
    const { data: eventArtists, error: eventArtistsError } = await supabase
      .from("event_artists")
      .select("event_id")
      .eq("artist_id", artistId)

    if (eventArtistsError || !eventArtists) {
      console.error("[v0] Error fetching artist events:", eventArtistsError)
      return []
    }

    const eventIds = eventArtists.map((ea) => ea.event_id)
    if (eventIds.length === 0) return []

    // Get event details
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, title, slug, description, starts_at, ends_at, status")
      .in("id", eventIds)
      .eq("status", "published")
      .order("starts_at", { ascending: true })

    if (eventsError) {
      console.error("[v0] Error fetching events for artist:", eventsError)
      return []
    }

    return events || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching artist events:", error)
    return []
  }
}

/**
 * Get all artists for an organization (internal use)
 */
export async function getOrgArtists(orgId: string): Promise<Artist[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching org artists:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching org artists:", error)
    return []
  }
}

/**
 * Get a single artist by ID
 */
export async function getArtistById(artistId: string): Promise<Artist | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("id", artistId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching artist:", error)
      return null
    }

    return data || null
  } catch (error) {
    console.error("[v0] Unexpected error fetching artist:", error)
    return null
  }
}

/**
 * Get artists by primary user ID
 */
export async function getArtistsByUserId(userId: string): Promise<Artist[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("artists")
      .select("*")
      .eq("primary_user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching user artists:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching user artists:", error)
    return []
  }
}

/**
 * Create a new artist
 */
export async function createArtist(
  orgId: string,
  artist: Omit<Artist, "id" | "created_at" | "updated_at">
): Promise<Artist | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("artists")
      .insert([
        {
          org_id: orgId,
          name: artist.name,
          bio: artist.bio || null,
          primary_user_id: artist.primary_user_id || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating artist:", error)
      return null
    }

    return data || null
  } catch (error) {
    console.error("[v0] Unexpected error creating artist:", error)
    return null
  }
}

/**
 * Update an artist
 */
export async function updateArtist(
  artistId: string,
  updates: Partial<Omit<Artist, "id" | "org_id" | "created_at">>
): Promise<Artist | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const updateData: Record<string, any> = {}

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.bio !== undefined) updateData.bio = updates.bio
    if (updates.primary_user_id !== undefined) updateData.primary_user_id = updates.primary_user_id
    if (Object.keys(updateData).length === 0) return getArtistById(artistId)

    const { data, error } = await supabase
      .from("artists")
      .update(updateData)
      .eq("id", artistId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating artist:", error)
      return null
    }

    return data || null
  } catch (error) {
    console.error("[v0] Unexpected error updating artist:", error)
    return null
  }
}

/**
 * Delete an artist
 */
export async function deleteArtist(artistId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from("artists")
      .delete()
      .eq("id", artistId)

    if (error) {
      console.error("[v0] Error deleting artist:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error deleting artist:", error)
    return false
  }
}

/**
 * Get artists for event (via event_artists junction table if it exists)
 */
export async function getEventArtists(eventId: string): Promise<Artist[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("event_artists")
      .select("artists(*)")
      .eq("event_id", eventId)

    if (error) {
      console.error("[v0] Error fetching event artists:", error)
      return []
    }

    return data?.map((item: any) => item.artists).filter(Boolean) || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching event artists:", error)
    return []
  }
}
