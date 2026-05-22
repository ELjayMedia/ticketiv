"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"

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
  const { user } = await requireAdminRole(ADMIN_ROLE_TIERS)
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

  if (input.id) {
    const { error } = await admin.from("payment_routing_rules").update(payload).eq("id", input.id)
    if (error) throw new Error(error.message)
    return { id: input.id }
  } else {
    const { data, error } = await admin
      .from("payment_routing_rules")
      .insert(payload)
      .select("id")
      .single()
    if (error || !data) throw new Error(error?.message ?? "insert failed")
    revalidatePath("/super-admin/routing")
    return { id: data.id }
  }
}

export async function deleteRoutingRule(id: string): Promise<void> {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin.from("payment_routing_rules").delete().eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/super-admin/routing")
}

export async function toggleRoutingRule(id: string, isActive: boolean): Promise<void> {
  await requireAdminRole(ADMIN_ROLE_TIERS)
  const admin = createAdminClient()
  const { error } = await admin
    .from("payment_routing_rules")
    .update({ is_active: isActive })
    .eq("id", id)
  if (error) throw new Error(error.message)
  revalidatePath("/super-admin/routing")
}
