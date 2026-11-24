// Derives the set of "contexts" (Personal / Org / Talent / Venue / Scan / Admin) the
// current user can switch between, from fn_get_ticketiv_effective_roles (S1).
// Single source of truth — see TICK-266.

import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getAuthUser } from "@/lib/auth/session"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Database } from "@/types/database"

export type ContextKind = "personal" | "org" | "talent" | "venue" | "scan" | "admin"

export interface UserContext {
  /** Stable unique key: "personal" | "org:<id>" | "talent:<id>" | "venue:<id>" | "scan" | "admin". */
  key: string
  kind: ContextKind
  label: string
  sublabel?: string
  href: string
}

interface RoleRow {
  role_key: string
  role_label: string
  source: string
  source_id: string | null
}

// Highest org role wins for the context sublabel when a user holds several.
const ORG_ROLE_RANK: Record<string, number> = {
  organizer_owner: 4,
  organizer_admin: 3,
  finance: 2,
  organizer_staff: 1,
  organizer: 1,
}

export async function getMyContexts(): Promise<UserContext[]> {
  const user = await getAuthUser()
  if (!user) return []
  const supabase = createServerSupabaseClient()
  if (!supabase) return []
  return loadContexts(supabase, user.id)
}

/**
 * Contexts for a user, read through a client authenticated as that user (the
 * roles RPC and the org/artist names are RLS-scoped). Used directly by login,
 * which already holds the fresh session and must not re-verify it.
 */
export async function loadContexts(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<UserContext[]> {
  const { data: rolesData } = await supabase.rpc("fn_get_ticketiv_effective_roles", {
    p_user_id: userId,
  })
  const rows = (rolesData ?? []) as RoleRow[]
  if (rows.length === 0) return []

  const orgRows = rows.filter((r) => r.source === "org_members" && r.source_id)
  const talentRows = rows.filter((r) => r.source === "artists.primary_user_id" && r.source_id)
  const venueRows = rows.filter((r) => r.source === "venue_members" && r.source_id)
  const hasScan = rows.some((r) => r.source === "event_staff")
  const isSuperAdmin = rows.some((r) => r.source === "admin_users" && r.role_key === "super_admin")

  const orgIds = [...new Set(orgRows.map((r) => r.source_id as string))]
  const artistIds = [...new Set(talentRows.map((r) => r.source_id as string))]
  const venueIds = [...new Set(venueRows.map((r) => r.source_id as string))]

  const [orgsRes, artistsRes, venuesRes] = await Promise.all([
    orgIds.length
      ? supabase.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    artistIds.length
      ? supabase.from("artists").select("id, name").in("id", artistIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    // Members can read their own venue row (venues_select_venue_member).
    venueIds.length
      ? supabase.from("venues").select("id, name").in("id", venueIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ])

  const orgName = new Map((orgsRes.data ?? []).map((o) => [o.id, o.name]))
  const artistName = new Map((artistsRes.data ?? []).map((a) => [a.id, a.name]))
  const venueName = new Map((venuesRes.data ?? []).map((v) => [v.id, v.name]))

  const contexts: UserContext[] = [
    { key: "personal", kind: "personal", label: "Personal", sublabel: "Your tickets", href: "/me" },
  ]

  // Orgs — one context per org, labelled with the highest role held.
  const byOrg = new Map<string, { role_label: string; rank: number }>()
  for (const r of orgRows) {
    const id = r.source_id as string
    const rank = ORG_ROLE_RANK[r.role_key] ?? 0
    const ex = byOrg.get(id)
    if (!ex || rank > ex.rank) byOrg.set(id, { role_label: r.role_label, rank })
  }
  for (const [id, info] of byOrg) {
    contexts.push({
      key: `org:${id}`,
      kind: "org",
      label: orgName.get(id) ?? "Organisation",
      sublabel: info.role_label,
      href: `/orgs/${id}`,
    })
  }

  // Talent — one per artist.
  for (const id of artistIds) {
    contexts.push({
      key: `talent:${id}`,
      kind: "talent",
      label: artistName.get(id) ?? "Talent",
      sublabel: "Talent",
      href: `/artists/${id}`,
    })
  }

  // Venues — one per venue membership (TICK-481), labelled with the role held.
  for (const r of venueRows) {
    const id = r.source_id as string
    contexts.push({
      key: `venue:${id}`,
      kind: "venue",
      label: venueName.get(id) ?? "Venue",
      sublabel: r.role_label,
      href: `/manage/venues/${id}`,
    })
  }

  if (hasScan) {
    contexts.push({ key: "scan", kind: "scan", label: "Scanner", sublabel: "Gate scanning", href: "/scan" })
  }

  if (isSuperAdmin) {
    contexts.push({ key: "admin", kind: "admin", label: "Admin", sublabel: "Command centre", href: "/super-admin" })
  }

  return contexts
}
