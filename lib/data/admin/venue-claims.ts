import "server-only"

import { untyped } from "@/lib/data/admin/console"
import { createAdminClient } from "@/lib/supabase/admin"
import type { VenueClaimStatus } from "@/lib/venues/core"

// Admin console: requests to manage a venue (TICK-481). Service-role reads,
// called only from pages behind requireAdminRole(). Decisions go through
// fn_review_venue_claim with the admin's own session.

export type VenueClaimFilter = "pending" | "closed"

export interface AdminVenueClaim {
  id: string
  kind: "claim" | "create"
  claimantRole: "venue_owner" | "venue_manager"
  status: VenueClaimStatus
  evidence: string
  contactPhone: string | null
  reviewNote: string | null
  createdAt: string
  reviewedAt: string | null
  claimant: { id: string; email: string | null; name: string | null }
  venue: { id: string; name: string; city: string | null; verified: boolean; ownerId: string | null; memberCount: number }
}

export async function listVenueClaims(filter: VenueClaimFilter): Promise<AdminVenueClaim[]> {
  const admin = untyped(createAdminClient())
  const statuses = filter === "pending" ? ["pending"] : ["approved", "rejected", "withdrawn"]
  const { data, error } = await admin
    .from("venue_claims")
    .select("id, kind, claimant_role, status, evidence, contact_phone, review_note, created_at, reviewed_at, claimant_id, venue_id")
    .in("status", statuses)
    .order("created_at", { ascending: filter === "pending" })
    .limit(100)
  if (error) throw new Error(`Could not load venue claims: ${error.message}`)
  const rows = (data ?? []) as Array<Record<string, any>>
  if (rows.length === 0) return []

  const venueIds = [...new Set(rows.map((r) => r.venue_id as string))]
  const userIds = [...new Set(rows.map((r) => r.claimant_id as string))]
  const [venuesRes, membersRes, profilesRes, users] = await Promise.all([
    admin.from("venues").select("id, name, city, verification_status").in("id", venueIds),
    admin.from("venue_members").select("venue_id, user_id, role").in("venue_id", venueIds),
    admin.from("profiles").select("user_id, display_name").in("user_id", userIds),
    Promise.all(
      userIds.map(async (id) => {
        const { data: u } = await createAdminClient().auth.admin.getUserById(id)
        return [id, u?.user?.email ?? null] as const
      }),
    ),
  ])
  const venues = new Map(((venuesRes.data ?? []) as Array<Record<string, any>>).map((v) => [v.id, v]))
  const members = (membersRes.data ?? []) as Array<{ venue_id: string; user_id: string; role: string }>
  const names = new Map(((profilesRes.data ?? []) as Array<Record<string, any>>).map((p) => [p.user_id, p.display_name as string | null]))
  const emails = new Map(users)

  return rows.map((r) => {
    const v = venues.get(r.venue_id)
    const venueMembers = members.filter((m) => m.venue_id === r.venue_id)
    return {
      id: r.id,
      kind: r.kind === "create" ? "create" : "claim",
      claimantRole: r.claimant_role === "venue_owner" ? "venue_owner" : "venue_manager",
      status: r.status as VenueClaimStatus,
      evidence: r.evidence,
      contactPhone: r.contact_phone,
      reviewNote: r.review_note,
      createdAt: r.created_at,
      reviewedAt: r.reviewed_at,
      claimant: { id: r.claimant_id, email: emails.get(r.claimant_id) ?? null, name: names.get(r.claimant_id) ?? null },
      venue: {
        id: r.venue_id,
        name: v?.name ?? "Unknown venue",
        city: v?.city ?? null,
        verified: v?.verification_status === "verified",
        ownerId: venueMembers.find((m) => m.role === "venue_owner")?.user_id ?? null,
        memberCount: venueMembers.length,
      },
    }
  })
}
