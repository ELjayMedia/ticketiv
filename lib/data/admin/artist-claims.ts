import "server-only"

import type { ArtistClaimStatus } from "@/lib/artists/core"
import { untyped } from "@/lib/data/admin/console"
import { createAdminClient } from "@/lib/supabase/admin"

// Admin console: requests to manage an artist (TICK-353). Service-role reads
// behind requireAdminRole(); decisions go through fn_review_artist_claim.

export type ArtistClaimFilter = "pending" | "closed"

export interface AdminArtistClaim {
  id: string
  claimantRole: "artist_owner" | "artist_manager"
  status: ArtistClaimStatus
  evidence: string
  contactPhone: string | null
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
  claimant: { id: string; email: string | null; name: string | null }
  artist: { id: string; name: string; verified: boolean; ownerId: string | null; lineups: number }
}

export async function listArtistClaims(filter: ArtistClaimFilter): Promise<AdminArtistClaim[]> {
  const admin = untyped(createAdminClient())
  const { data, error } = await admin
    .from("artist_claims")
    .select("id, claimant_role, status, evidence, contact_phone, review_note, created_at, reviewed_at, claimant_id, artist_id")
    .in("status", filter === "pending" ? ["pending"] : ["approved", "rejected", "withdrawn"])
    .order("created_at", { ascending: filter === "pending" })
    .limit(100)
  if (error) throw new Error(`Could not load artist claims: ${error.message}`)
  const rows = (data ?? []) as Array<Record<string, any>>
  if (rows.length === 0) return []
  const artistIds = [...new Set(rows.map((r) => r.artist_id as string))]
  const userIds = [...new Set(rows.map((r) => r.claimant_id as string))]
  const [artistsRes, lineupsRes, profilesRes, emails] = await Promise.all([
    admin.from("artists").select("id, name, verification_status, primary_user_id").in("id", artistIds),
    admin.from("event_artists").select("artist_id").in("artist_id", artistIds),
    admin.from("profiles").select("user_id, display_name").in("user_id", userIds),
    Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await createAdminClient().auth.admin.getUserById(id)
        return [id, u?.user?.email ?? null] as const
      }),
    ),
  ])
  const artists = new Map(((artistsRes.data ?? []) as Array<Record<string, any>>).map((a) => [a.id, a]))
  const lineups = ((lineupsRes.data ?? []) as Array<{ artist_id: string }>).reduce<Record<string, number>>((m, r) => ({ ...m, [r.artist_id]: (m[r.artist_id] ?? 0) + 1 }), {})
  const names = new Map(((profilesRes.data ?? []) as Array<Record<string, any>>).map((p) => [p.user_id, p.display_name as string | null]))
  const emailMap = new Map(emails)
  return rows.map((r) => {
    const a = artists.get(r.artist_id)
    return {
      id: r.id,
      claimantRole: r.claimant_role === "artist_owner" ? "artist_owner" : "artist_manager",
      status: r.status as ArtistClaimStatus,
      evidence: r.evidence,
      contactPhone: r.contact_phone,
      reviewNote: r.review_note,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      claimant: { id: r.claimant_id, email: emailMap.get(r.claimant_id) ?? null, name: names.get(r.claimant_id) ?? null },
      artist: { id: r.artist_id, name: a?.name ?? "Unknown artist", verified: a?.verification_status === "verified", ownerId: a?.primary_user_id ?? null, lineups: lineups[r.artist_id] ?? 0 },
    }
  })
}
