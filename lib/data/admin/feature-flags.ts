// Source: feature_flags (platform-level rows: org_id IS NULL).
// Plus org-scoped flags for the "rollout per org" reference column.

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export interface PlatformFlag {
  id: string
  key: string
  enabled: boolean
  rollout_percent: number | null
  owner: string | null
  owner_email: string | null
  description: string | null
  tags: string[]
  last_changed_at: string | null
  last_changed_by: string | null
  config: unknown
  per_org_overrides: number // count of per-org rows with same key
}

export async function getPlatformFlags(): Promise<PlatformFlag[]> {
  const admin = createAdminClient()

  const [platformRes, orgRes] = await Promise.all([
    admin
      .from("feature_flags")
      .select("id, key, enabled, rollout_percent, owner, description, tags, last_changed_at, last_changed_by, config")
      .is("org_id", null)
      .order("key", { ascending: true }),
    admin
      .from("feature_flags")
      .select("key, org_id")
      .not("org_id", "is", null),
  ])

  const orgsPerKey = new Map<string, number>()
  for (const row of orgRes.data ?? []) {
    orgsPerKey.set(row.key, (orgsPerKey.get(row.key) ?? 0) + 1)
  }

  const ownerIds = new Set<string>()
  for (const f of platformRes.data ?? []) if (f.owner) ownerIds.add(f.owner)

  const ownerEmails = new Map<string, string>()
  if (ownerIds.size > 0) {
    await Promise.all(
      [...ownerIds].map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id)
          if (data?.user?.email) ownerEmails.set(id, data.user.email)
        } catch {
          /* swallow */
        }
      }),
    )
  }

  return (platformRes.data ?? []).map((f) => ({
    id: f.id,
    key: f.key,
    enabled: f.enabled,
    rollout_percent: f.rollout_percent,
    owner: f.owner,
    owner_email: f.owner ? ownerEmails.get(f.owner) ?? null : null,
    description: f.description,
    tags: f.tags ?? [],
    last_changed_at: f.last_changed_at,
    last_changed_by: f.last_changed_by,
    config: f.config,
    per_org_overrides: orgsPerKey.get(f.key) ?? 0,
  }))
}
