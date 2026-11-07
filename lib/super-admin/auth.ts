import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { getAuthUser } from "@/lib/auth/session"
import { canDo, type ConsoleAction } from "@/lib/super-admin/console"
import { createAdminClient } from "@/lib/supabase/admin"

type AdminRoleTier = "super_admin" | "finance_admin" | "support_admin" | "event_ops_admin" | "read_only_admin"

/** The signed-in admin and their role, looked up once per request. Null when not an active admin. */
export const getAdminContext = cache(async () => {
  const user = await getAuthUser()
  if (!user) return null
  const { data } = await createAdminClient()
    .from("admin_users")
    .select("role_tier, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()
  if (!data) return null
  return { user, role: data.role_tier as AdminRoleTier }
})

/**
 * For server actions: the admin, if their role may perform this console action.
 * Returns null instead of redirecting so the action can explain the refusal.
 */
export async function adminForAction(action: ConsoleAction) {
  const context = await getAdminContext()
  if (!context || !canDo(action, context.role)) return null
  return context
}

export async function requireSuperAdmin() {
  // Verified once per request (layouts and pages both call this).
  const user = await getAuthUser()

  if (!user) {
    redirect("/super-admin/login")
  }

  const context = await getAdminContext()
  if (!context) {
    redirect("/")
  }

  return user
}

export async function requireAdminRole(allowedRoles: AdminRoleTier[]) {
  const user = await requireSuperAdmin()
  const context = await getAdminContext()

  if (!context || !allowedRoles.includes(context.role)) {
    redirect("/super-admin")
  }

  return { user, roleTier: context.role }
}
