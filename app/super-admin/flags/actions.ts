"use server"

// Platform feature flag mutations. Super-admin only. RLS is enforced
// inside the table policies (feature_flags_platform_write) but we
// authenticate first via requireAdminRole so 401s are returned cleanly.

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

// Platform config is a write action — read-only admins may view but not
// mutate. The service-role client bypasses the is_super_admin RLS on
// feature_flags, so this list is the real enforcement boundary.
const CONFIG_WRITE_TIERS = ADMIN_ROLE_TIERS.filter((tier) => tier !== "read_only_admin")

type Admin = ReturnType<typeof createAdminClient>

async function auditFlag(
  admin: Admin,
  actorId: string,
  recordId: string,
  action: "insert" | "update" | "delete",
  changes: Record<string, unknown>,
) {
  await admin.from("audit_log").insert({
    org_id: null,
    actor_id: actorId,
    table_name: "feature_flags",
    record_id: recordId,
    action,
    changes: { business_action: "configure_feature_flag", ...changes },
  })
}

export interface FlagUpsertInput {
  id?: string
  key: string
  enabled: boolean
  rollout_percent: number | null
  description?: string | null
  tags?: string[]
}

export async function upsertPlatformFlag(input: FlagUpsertInput): Promise<{ id: string }> {
  const { user } = await requireAdminRole(CONFIG_WRITE_TIERS)
  if (!input.key.trim()) throw new Error("key required")
  if (input.rollout_percent !== null && (input.rollout_percent < 0 || input.rollout_percent > 100)) {
    throw new Error("rollout_percent must be 0-100")
  }

  const admin = createAdminClient()
  const payload = {
    key: input.key.trim(),
    enabled: input.enabled,
    rollout_percent: input.rollout_percent,
    description: input.description ?? null,
    tags: input.tags ?? [],
    org_id: null,
    last_changed_by: user.id,
    last_changed_at: new Date().toISOString(),
  }

  let recordId = input.id ?? ""
  if (input.id) {
    const { error } = await admin.from("feature_flags").update(payload).eq("id", input.id).is("org_id", null)
    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await admin.from("feature_flags").insert(payload).select("id").single()
    if (error) throw new Error(error.message)
    recordId = data?.id ?? ""
  }

  await auditFlag(admin, user.id, recordId, input.id ? "update" : "insert", {
    key: payload.key,
    enabled: payload.enabled,
    rollout_percent: payload.rollout_percent,
  })

  revalidatePath("/super-admin/flags")
  return { id: recordId }
}

export async function deletePlatformFlag(id: string): Promise<void> {
  const { user } = await requireAdminRole(CONFIG_WRITE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin.from("feature_flags").delete().eq("id", id).is("org_id", null)
  if (error) throw new Error(error.message)
  await auditFlag(admin, user.id, id, "delete", {})
  revalidatePath("/super-admin/flags")
}

export async function togglePlatformFlag(id: string, enabled: boolean): Promise<void> {
  const { user } = await requireAdminRole(CONFIG_WRITE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin
    .from("feature_flags")
    .update({ enabled, last_changed_by: user.id })
    .eq("id", id)
    .is("org_id", null)
  if (error) throw new Error(error.message)
  await auditFlag(admin, user.id, id, "update", { enabled })
  revalidatePath("/super-admin/flags")
}
