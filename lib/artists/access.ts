import "server-only"

import { cache } from "react"

import { isArtistRole, type ArtistRole } from "@/lib/artists/core"
import { getAuthUser } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { UUID_RE } from "@/lib/venues/core"

export interface ManagedArtist {
  id: string
  name: string
  slug: string
  bio: string | null
  performerType: string | null
  genres: string[]
  imageUrl: string | null
  coverImageUrl: string | null
  links: Record<string, string>
  pressKitUrl: string | null
  bookingEmail: string | null
  bookingInfo: string | null
  verified: boolean
}

export interface ArtistAccess {
  userId: string
  role: ArtistRole
  artist: ManagedArtist
}

/** The caller's role on an artist, through their own RLS-scoped session. */
export const getArtistAccess = cache(async (artistId: string): Promise<ArtistAccess | null> => {
  if (!UUID_RE.test(artistId)) return null
  const user = await getAuthUser()
  if (!user) return null
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return null
  const [memberRes, artistRes] = await Promise.all([
    supabase.from("artist_members").select("role").eq("artist_id", artistId).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("artists")
      .select("id, name, slug, bio, performer_type, genres, image_url, cover_image_url, links, press_kit_url, booking_email, booking_info, verification_status")
      .eq("id", artistId)
      .maybeSingle(),
  ])
  if (memberRes.error) throw new Error(`Could not load artist access: ${memberRes.error.message}`)
  if (artistRes.error) throw new Error(`Could not load artist: ${artistRes.error.message}`)
  const role = memberRes.data?.role
  const a = artistRes.data
  if (!isArtistRole(role) || !a) return null
  return {
    userId: user.id,
    role,
    artist: {
      id: a.id,
      name: a.name,
      slug: a.slug,
      bio: a.bio,
      performerType: a.performer_type,
      genres: a.genres ?? [],
      imageUrl: a.image_url,
      coverImageUrl: a.cover_image_url,
      links: (a.links ?? {}) as Record<string, string>,
      pressKitUrl: a.press_kit_url,
      bookingEmail: a.booking_email,
      bookingInfo: a.booking_info,
      verified: a.verification_status === "verified",
    },
  }
})
