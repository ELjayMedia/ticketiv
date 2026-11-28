// Source: feature_flags (platform-level rows: org_id IS NULL) and
// feature_flag_exclusions (organisations / events a feature is kept off for).

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

// ── Feature flag cards (command centre) ───────────────────────────────────

export interface FlagExclusionView {
  id: string
  kind: "organisation" | "event"
  orgId: string | null
  eventId: string | null
  label: string
  detail: string | null
  reason: string | null
  createdAt: string
}

export interface FlagCardData {
  key: string
  enabled: boolean
  description: string | null
  lastChangedAt: string | null
  exclusions: FlagExclusionView[]
}

export interface FlagTargetOptions {
  organisations: { id: string; name: string }[]
  events: { id: string; orgId: string | null; title: string; startsAt: string | null }[]
}

type Untyped = { from: (t: string) => any }

/** Platform flags with their exclusions, plus the organisations and events that can be excluded. */
export async function getFeatureFlagBoard(): Promise<{ flags: FlagCardData[]; targets: FlagTargetOptions }> {
  const admin = createAdminClient()
  const db = admin as unknown as Untyped
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()

  const [flagsRes, exclusionsRes, orgsRes, eventsRes] = await Promise.all([
    admin.from("feature_flags").select("key, enabled, description, last_changed_at").is("org_id", null).order("key"),
    db.from("feature_flag_exclusions").select("id, flag_key, org_id, event_id, reason, created_at").order("created_at"),
    admin.from("organizations").select("id, name").order("name").limit(1000),
    // Events that can still matter: upcoming, running, or ended in the last 30 days.
    admin
      .from("events")
      .select("id, org_id, title, starts_at, ends_at")
      .or(`ends_at.gte.${since},ends_at.is.null,starts_at.gte.${since}`)
      .order("starts_at", { ascending: true })
      .limit(1000),
  ])

  if (exclusionsRes.error) console.error("[feature-flags] exclusions read failed", exclusionsRes.error)
  const exclusionRows = (exclusionsRes.data ?? []) as {
    id: string
    flag_key: string
    org_id: string | null
    event_id: string | null
    reason: string | null
    created_at: string
  }[]

  const organisations = (orgsRes.data ?? []).map((o) => ({ id: o.id as string, name: (o.name as string | null) ?? "Unnamed organisation" }))
  const orgName = new Map(organisations.map((o) => [o.id, o.name]))
  const events = (eventsRes.data ?? []).map((e) => ({
    id: e.id as string,
    orgId: (e.org_id as string | null) ?? null,
    title: (e.title as string | null) ?? "Untitled event",
    startsAt: (e.starts_at as string | null) ?? null,
  }))
  const eventById = new Map(events.map((e) => [e.id, e]))

  // Excluded events outside the window above still need a name.
  const missing = [...new Set(exclusionRows.map((r) => r.event_id).filter((id): id is string => Boolean(id) && !eventById.has(id!)))]
  if (missing.length) {
    const { data } = await admin.from("events").select("id, org_id, title, starts_at").in("id", missing)
    for (const e of data ?? []) {
      eventById.set(e.id, { id: e.id, orgId: e.org_id ?? null, title: e.title ?? "Untitled event", startsAt: e.starts_at ?? null })
    }
  }

  const flags: FlagCardData[] = (flagsRes.data ?? []).map((f) => ({
    key: f.key,
    enabled: Boolean(f.enabled),
    description: f.description ?? null,
    lastChangedAt: f.last_changed_at ?? null,
    exclusions: exclusionRows
      .filter((r) => r.flag_key === f.key)
      .map((r): FlagExclusionView => {
        if (r.org_id) {
          return { id: r.id, kind: "organisation", orgId: r.org_id, eventId: null, label: orgName.get(r.org_id) ?? "Organisation", detail: "All its events", reason: r.reason, createdAt: r.created_at }
        }
        const event = r.event_id ? eventById.get(r.event_id) : undefined
        return {
          id: r.id,
          kind: "event",
          orgId: event?.orgId ?? null,
          eventId: r.event_id,
          label: event?.title ?? "Event",
          detail: event?.orgId ? orgName.get(event.orgId) ?? null : null,
          reason: r.reason,
          createdAt: r.created_at,
        }
      }),
  }))

  return { flags, targets: { organisations, events } }
}
