"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getEventArtists(eventId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("event_artists")
      .select("artist_id, role, artists(id, name, bio, avatar_url, genre, role)")
      .eq("event_id", eventId)

    if (error) {
      console.error("[v0] Error fetching event artists:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching event artists:", error)
    return []
  }
}

export async function addArtistToEvent(eventId: string, artistId: string, role?: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("event_artists")
      .insert([{ event_id: eventId, artist_id: artistId, role }])
      .select()

    if (error) {
      console.error("[v0] Error adding artist to event:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error adding artist to event:", error)
    return null
  }
}

export async function removeArtistFromEvent(eventId: string, artistId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { error } = await supabase
      .from("event_artists")
      .delete()
      .eq("event_id", eventId)
      .eq("artist_id", artistId)

    if (error) {
      console.error("[v0] Error removing artist from event:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("[v0] Unexpected error removing artist from event:", error)
    return false
  }
}

export async function updateArtistRole(eventId: string, artistId: string, role: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("event_artists")
      .update({ role })
      .eq("event_id", eventId)
      .eq("artist_id", artistId)
      .select()

    if (error) {
      console.error("[v0] Error updating artist role:", error)
      return null
    }

    return data?.[0] || null
  } catch (error) {
    console.error("[v0] Unexpected error updating artist role:", error)
    return null
  }
}
