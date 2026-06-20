"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Artist {
  id: string
  org_id: string | null
  name: string
  bio?: string | null
  created_at?: string | null
  updated_at?: string | null
  primary_user_id?: string | null
}

/**
 * Get all artists for an organization
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
    const artistSlug = artist.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
    const { data, error } = await supabase
      .from("artists")
      .insert([
        {
          org_id: orgId,
          name: artist.name,
          slug: `${artistSlug}-${Date.now()}`,
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
      .update(updateData as any)
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
