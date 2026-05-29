"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

// Payment routing is a write action — read-only admins may view but not
// mutate. The service-role client bypasses the is_super_admin RLS on
// payment_routing_rules, so this list is the real enforcement boundary.
const CONFIG_WRITE_TIERS = ADMIN_ROLE_TIERS.filter((tier) => tier !== "read_only_admin")

type Admin = ReturnType<typeof createAdminClient>

async function auditRoutingRule(
  admin: Admin,
  actorId: string,
  recordId: string,
  action: "insert" | "update" | "delete",
  changes: Record<string, unknown>,
) {
  await admin.from("audit_log").insert({
    org_id: null,
    actor_id: actorId,
    table_name: "payment_routing_rules",
    record_id: recordId,
    action,
    changes: { business_action: "configure_payment_routing", ...changes },
  })
}

export interface RoutingRuleInput {
  id?: string
  priority: number
  country_code: string | null
  currency: string | null
  provider: string
  fallback_provider: string | null
  is_active: boolean
  notes: string | null
}

export async function upsertRoutingRule(input: RoutingRuleInput): Promise<{ id: string }> {
  const { user } = await requireAdminRole(CONFIG_WRITE_TIERS)
  if (!input.provider.trim()) throw new Error("provider required")
  if (input.priority < 0 || input.priority > 1000) throw new Error("priority must be 0-1000")

  const admin = createAdminClient()
  const payload = {
    priority: input.priority,
    country_code: input.country_code?.trim().toUpperCase() || null,
    currency: input.currency?.trim().toUpperCase() || null,
    provider: input.provider.trim(),
    fallback_provider: input.fallback_provider?.trim() || null,
    is_active: input.is_active,
    notes: input.notes?.trim() || null,
    created_by: user.id,
  }

  let recordId = input.id ?? ""
  if (input.id) {
    const { error } = await admin.from("payment_routing_rules").update(payload).eq("id", input.id)
    if (error) throw new Error(error.message)
  } else {
    const { data, error } = await admin.from("payment_routing_rules").insert(payload).select("id").single()
    if (error || !data) throw new Error(error?.message ?? "insert failed")
    recordId = data.id
  }

  await auditRoutingRule(admin, user.id, recordId, input.id ? "update" : "insert", {
    provider: payload.provider,
    fallback_provider: payload.fallback_provider,
    currency: payload.currency,
    country_code: payload.country_code,
    priority: payload.priority,
    is_active: payload.is_active,
  })

  revalidatePath("/super-admin/routing")
  return { id: recordId }
}

export async function deleteRoutingRule(id: string): Promise<void> {
  const { user } = await requireAdminRole(CONFIG_WRITE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin.from("payment_routing_rules").delete().eq("id", id)
  if (error) throw new Error(error.message)
  await auditRoutingRule(admin, user.id, id, "delete", {})
  revalidatePath("/super-admin/routing")
}

export async function toggleRoutingRule(id: string, isActive: boolean): Promise<void> {
  const { user } = await requireAdminRole(CONFIG_WRITE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin
    .from("payment_routing_rules")
    .update({ is_active: isActive })
    .eq("id", id)
  if (error) throw new Error(error.message)
  await auditRoutingRule(admin, user.id, id, "update", { is_active: isActive })
  revalidatePath("/super-admin/routing")
}
