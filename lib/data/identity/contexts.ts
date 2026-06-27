// Derives the set of "contexts" (Personal / Org / Talent / Scan / Admin) the
// current user can switch between, from fn_get_ticketiv_effective_roles (S1).
// Single source of truth — see TICK-266.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export type ContextKind = "personal" | "org" | "talent" | "scan" | "admin"

export interface UserContext {
  /** Stable unique key: "personal" | "org:<id>" | "talent:<id>" | "scan" | "admin". */
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
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rolesData } = await supabase.rpc("fn_get_ticketiv_effective_roles", {
    p_user_id: user.id,
  })
  const rows = (rolesData ?? []) as RoleRow[]
  if (rows.length === 0) return []

  const orgRows = rows.filter((r) => r.source === "org_members" && r.source_id)
  const talentRows = rows.filter((r) => r.source === "artists.primary_user_id" && r.source_id)
  const hasScan = rows.some((r) => r.source === "event_staff")
  const isSuperAdmin = rows.some((r) => r.source === "admin_users" && r.role_key === "super_admin")

  const orgIds = [...new Set(orgRows.map((r) => r.source_id as string))]
  const artistIds = [...new Set(talentRows.map((r) => r.source_id as string))]

  const [orgsRes, artistsRes] = await Promise.all([
    orgIds.length
      ? supabase.from("organizations").select("id, name").in("id", orgIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
    artistIds.length
      ? supabase.from("artists").select("id, name").in("id", artistIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ])

  const orgName = new Map((orgsRes.data ?? []).map((o) => [o.id, o.name]))
  const artistName = new Map((artistsRes.data ?? []).map((a) => [a.id, a.name]))

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
      href: `/orgs/${id}/dashboard`,
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

  if (hasScan) {
    contexts.push({ key: "scan", kind: "scan", label: "Scanner", sublabel: "Gate scanning", href: "/scan" })
  }

  if (isSuperAdmin) {
    contexts.push({ key: "admin", kind: "admin", label: "Admin", sublabel: "Command centre", href: "/super-admin" })
  }

  return contexts
}
