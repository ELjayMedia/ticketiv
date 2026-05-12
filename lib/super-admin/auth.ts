import "server-only"

import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type AdminRoleTier = "super_admin" | "finance_admin" | "support_admin" | "event_ops_admin" | "read_only_admin"

export async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/super-admin/login")
  }

  const admin = createAdminClient()
  const { data } = await admin
    .from("admin_users")
    .select("user_id, role_tier, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (!data) {
    redirect("/dashboard")
  }

  return user
}

export async function requireAdminRole(allowedRoles: AdminRoleTier[]) {
  const user = await requireSuperAdmin()
  const admin = createAdminClient()
  const { data } = await admin
    .from("admin_users")
    .select("role_tier, active")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (!data || !allowedRoles.includes(data.role_tier as AdminRoleTier)) {
    redirect("/super-admin")
  }

  return { user, roleTier: data.role_tier as AdminRoleTier }
}
