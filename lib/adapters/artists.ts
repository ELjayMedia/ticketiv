"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { validateSchema, ArtistPublicViewSchema, ArtistEventsPublicViewSchema, type ArtistPublicView, type EventsPublicView } from "@/lib/schemas/views"

/**
 * Adapter for public artist profiles
 */

export async function getPublicArtistsList(params?: {
  limit?: number
  offset?: number
  search?: string
  genre?: string
}): Promise<ArtistPublicView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty artists list")
    return []
  }

  try {
    let query = supabase.from("v_artist_public").select("*")

    if (params?.search) {
      query = query.ilike("name", `%${params.search}%`)
    }

    if (params?.genre) {
      query = query.eq("genre", params.genre)
    }

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching public artists:", error)
      return []
    }

    if (!data) return []
    return data.map((item) => validateSchema(ArtistPublicViewSchema, item, "v_artist_public"))
  } catch (error) {
    console.error("[v0] Exception in getPublicArtistsList:", error)
    return []
  }
}

export async function getPublicArtistById(artistId: string): Promise<ArtistPublicView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch artist details")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_artist_public")
      .select("*")
      .eq("id", artistId)
      .single()

    if (error) {
      console.error("[v0] Error fetching artist:", error)
      return null
    }

    if (!data) return null
    return validateSchema(ArtistPublicViewSchema, data, "v_artist_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicArtistById:", error)
    return null
  }
}

export async function getPublicArtistEvents(artistId: string, params?: {
  limit?: number
  offset?: number
}): Promise<EventsPublicView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, returning empty artist events")
    return []
  }

  try {
    let query = supabase
      .from("v_artist_events_public")
      .select("*")
      .eq("artist_id", artistId)

    const limit = params?.limit || 24
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching artist events:", error)
      return []
    }

    if (!data) return []
    return validateSchema(ArtistEventsPublicViewSchema, data, "v_artist_events_public")
  } catch (error) {
    console.error("[v0] Exception in getPublicArtistEvents:", error)
    return []
  }
}
