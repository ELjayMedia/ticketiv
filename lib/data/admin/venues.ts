import "server-only"

import { untyped } from "@/lib/data/admin/console"
import { createAdminClient } from "@/lib/supabase/admin"

// Admin console: the venue directory and who can manage each venue (venue MVP).
// Service-role reads, called only from pages behind requireAdminRole().
// Changes go through the fn_admin_*_venue* RPCs with the admin's own session.

export type VenueMemberRole = "venue_owner" | "venue_manager" | "venue_staff"

export interface AdminVenueRow {
  id: string
  name: string
  city: string | null
  slug: string | null
  verified: boolean
  memberCount: number
  hasOwner: boolean
}

export interface AdminVenueDetail extends AdminVenueRow {
  address: string | null
  capacity: number | null
  contactEmail: string | null
  contactPhone: string | null
  createdAt: string | null
  members: Array<{ userId: string; role: VenueMemberRole; email: string | null; name: string | null; addedAt: string }>
  openLeads: number
  upcomingBookings: number
  upcomingEvents: number
  pendingClaims: number
}

const ROLE_ORDER: Record<VenueMemberRole, number> = { venue_owner: 0, venue_manager: 1, venue_staff: 2 }

/** Venues matching a name or city, verified and managed first. Empty query → most recent. */
export async function listAdminVenues(query: string): Promise<AdminVenueRow[]> {
  const admin = untyped(createAdminClient())
  const q = query.trim().replace(/[%_,()]/g, " ").slice(0, 80)
  let req = admin.from("venues").select("id, name, city, slug, verification_status, created_at").limit(60)
  req = q ? req.or(`name.ilike.%${q}%,city.ilike.%${q}%`).order("name") : req.order("created_at", { ascending: false })
  const { data, error } = await req
  if (error) throw new Error(`Could not load venues: ${error.message}`)
  const venues = (data ?? []) as Array<Record<string, any>>
  if (venues.length === 0) return []

  const { data: members } = await admin
    .from("venue_members")
    .select("venue_id, role")
    .in(
      "venue_id",
      venues.map((v) => v.id),
    )
  const byVenue = new Map<string, string[]>()
  for (const m of (members ?? []) as Array<{ venue_id: string; role: string }>) {
    byVenue.set(m.venue_id, [...(byVenue.get(m.venue_id) ?? []), m.role])
  }
  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city ?? null,
    slug: v.slug ?? null,
    verified: v.verification_status === "verified",
    memberCount: byVenue.get(v.id)?.length ?? 0,
    hasOwner: (byVenue.get(v.id) ?? []).includes("venue_owner"),
  }))
}

export async function getAdminVenue(venueId: string): Promise<AdminVenueDetail | null> {
  const service = createAdminClient()
  const admin = untyped(service)
  const { data: v } = await admin
    .from("venues")
    .select("id, name, city, slug, address, capacity, contact_email, contact_phone, verification_status, created_at")
    .eq("id", venueId)
    .maybeSingle()
  if (!v) return null
  const now = new Date().toISOString()

  const [membersRes, leadsRes, bookingsRes, eventsRes, claimsRes] = await Promise.all([
    admin.from("venue_members").select("user_id, role, created_at").eq("venue_id", venueId),
    admin.from("venue_enquiries").select("id", { count: "exact", head: true }).eq("venue_id", venueId).eq("status", "open"),
    admin.from("venue_bookings").select("id", { count: "exact", head: true }).eq("venue_id", venueId).eq("status", "confirmed").gte("ends_at", now),
    admin.from("events").select("id", { count: "exact", head: true }).eq("venue_id", venueId).neq("status", "draft").gte("starts_at", now),
    admin.from("venue_claims").select("id", { count: "exact", head: true }).eq("venue_id", venueId).eq("status", "pending"),
  ])
  const rows = (membersRes.data ?? []) as Array<{ user_id: string; role: VenueMemberRole; created_at: string }>
  const userIds = rows.map((r) => r.user_id)
  const [profilesRes, emails] = await Promise.all([
    userIds.length ? admin.from("profiles").select("user_id, display_name").in("user_id", userIds) : Promise.resolve({ data: [] }),
    Promise.all(
      userIds.map(async (id) => {
        const { data } = await service.auth.admin.getUserById(id)
        return [id, data?.user?.email ?? null] as const
      }),
    ),
  ])
  const names = new Map(((profilesRes.data ?? []) as Array<Record<string, any>>).map((p) => [p.user_id, (p.display_name as string | null) ?? null]))
  const emailById = new Map(emails)
  const members = rows
    .map((r) => ({ userId: r.user_id, role: r.role, email: emailById.get(r.user_id) ?? null, name: names.get(r.user_id) ?? null, addedAt: r.created_at }))
    .sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || a.addedAt.localeCompare(b.addedAt))

  return {
    id: v.id,
    name: v.name,
    city: v.city ?? null,
    slug: v.slug ?? null,
    verified: v.verification_status === "verified",
    memberCount: members.length,
    hasOwner: members.some((m) => m.role === "venue_owner"),
    address: v.address ?? null,
    capacity: v.capacity ?? null,
    contactEmail: v.contact_email ?? null,
    contactPhone: v.contact_phone ?? null,
    createdAt: v.created_at ?? null,
    members,
    openLeads: leadsRes.count ?? 0,
    upcomingBookings: bookingsRes.count ?? 0,
    upcomingEvents: eventsRes.count ?? 0,
    pendingClaims: claimsRes.count ?? 0,
  }
}
