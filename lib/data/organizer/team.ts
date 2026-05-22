// Source: org_members + event_staff (joined to events) + profiles + auth admin.
// Auth admin is required to surface emails because they aren't in profiles.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"

export interface TeamMember {
  user_id: string | null // null for device/POS terminal seats
  display_name: string
  email: string | null
  role: string
  events_scope: "all" | string // event title or "all"
  joined_at: string | null
  last_active_at: string | null
  flag?: "never_logged_in"
}

export interface OrgTeam {
  orgName: string
  active: TeamMember[]
  pendingInvites: number
}

export async function getOrgTeam(orgId: string): Promise<OrgTeam | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const [orgRes, membersRes, staffRes] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase
      .from("org_members")
      .select("user_id, role, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true }),
    supabase
      .from("event_staff")
      .select("user_id, role, active, created_at, events:events!inner(id, title, org_id)")
      .eq("events.org_id", orgId)
      .eq("active", true)
      .order("created_at", { ascending: true }),
  ])

  if (!orgRes.data) return null

  const admin = createAdminClient()
  const userIds = new Set<string>()
  for (const m of membersRes.data ?? []) if (m.user_id) userIds.add(m.user_id)
  for (const s of staffRes.data ?? []) if (s.user_id) userIds.add(s.user_id)

  const profiles = new Map<string, { display_name: string | null; name: string | null; surname: string | null }>()
  const emails = new Map<string, string | null>()

  if (userIds.size > 0) {
    const ids = [...userIds]
    const profRes = await supabase
      .from("profiles")
      .select("user_id, display_name, name, surname")
      .in("user_id", ids)
    for (const p of profRes.data ?? []) {
      profiles.set(p.user_id, p)
    }
    await Promise.all(
      ids.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id)
          emails.set(id, data?.user?.email ?? null)
        } catch {
          emails.set(id, null)
        }
      }),
    )
  }

  const nameFor = (uid: string): string => {
    const p = profiles.get(uid)
    if (p?.display_name) return p.display_name
    const composed = [p?.name, p?.surname].filter(Boolean).join(" ").trim()
    if (composed) return composed
    return emails.get(uid)?.split("@")[0] ?? "Member"
  }

  const active: TeamMember[] = []

  for (const m of membersRes.data ?? []) {
    if (!m.user_id) continue
    active.push({
      user_id: m.user_id,
      display_name: nameFor(m.user_id),
      email: emails.get(m.user_id) ?? null,
      role: String(m.role),
      events_scope: "all",
      joined_at: m.created_at,
      last_active_at: null,
    })
  }

  for (const s of staffRes.data ?? []) {
    const ev = (s as unknown as { events: { id: string; title: string } | null }).events
    if (s.user_id && active.some((a) => a.user_id === s.user_id && a.events_scope === "all")) {
      // already an org member; skip the per-event row in the basic view
      continue
    }
    active.push({
      user_id: s.user_id,
      display_name: s.user_id ? nameFor(s.user_id) : ev?.title ?? "Staff",
      email: s.user_id ? emails.get(s.user_id) ?? null : null,
      role: String(s.role),
      events_scope: ev?.title ?? "—",
      joined_at: s.created_at,
      last_active_at: null,
    })
  }

  return {
    orgName: orgRes.data.name,
    active,
    pendingInvites: 0,
  }
}
