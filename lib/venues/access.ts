import "server-only"

import { cache } from "react"

import { getAuthUser } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isVenueRole, UUID_RE, type VenueRole, type VenueVerification } from "@/lib/venues/core"

export interface ManagedVenue {
  id: string
  name: string
  slug: string
  city: string | null
  address: string | null
  capacity: number | null
  description: string | null
  website: string | null
  contactEmail: string | null
  contactPhone: string | null
  verificationStatus: VenueVerification
  verifiedAt: string | null
  venueType: string | null
}

export interface VenueAccess {
  userId: string
  role: VenueRole
  venue: ManagedVenue
}

/**
 * The caller's role at a venue, read through their own RLS-scoped session:
 * venue_members only exposes rows to members of that venue, and the venue row
 * is readable to members (venues_select_venue_member). Null when the caller is
 * signed out or not on the team. Cached per request.
 */
export const getVenueAccess = cache(async (venueId: string): Promise<VenueAccess | null> => {
  if (!UUID_RE.test(venueId)) return null
  const user = await getAuthUser()
  if (!user) return null
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const [memberRes, venueRes] = await Promise.all([
    supabase.from("venue_members").select("role").eq("venue_id", venueId).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("venues")
      .select("id, name, slug, city, address, capacity, description, website, contact_email, contact_phone, verification_status, verified_at, venue_type")
      .eq("id", venueId)
      .maybeSingle(),
  ])
  if (memberRes.error) throw new Error(`Could not load venue access: ${memberRes.error.message}`)
  if (venueRes.error) throw new Error(`Could not load venue: ${venueRes.error.message}`)

  const role = memberRes.data?.role
  const v = venueRes.data
  if (!isVenueRole(role) || !v) return null

  return {
    userId: user.id,
    role,
    venue: {
      id: v.id,
      name: v.name,
      slug: v.slug,
      city: v.city,
      address: v.address,
      capacity: v.capacity,
      description: v.description,
      website: v.website,
      contactEmail: v.contact_email,
      contactPhone: v.contact_phone,
      verificationStatus: v.verification_status === "verified" ? "verified" : "unverified",
      verifiedAt: v.verified_at,
      venueType: v.venue_type ?? null,
    },
  }
})
