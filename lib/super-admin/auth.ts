import "server-only"

import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function requireSuperAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/super-admin/login")
  }

  const admin = createAdminClient()
  const { data } = await admin.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle()

  if (!data) {
    redirect("/dashboard")
  }

  return user
}
