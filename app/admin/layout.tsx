import type React from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSession } from "@/lib/demo-auth"

/**
 * Admin layout
 * Enforces global admin access before allowing any /admin/* subroutes
 * This is the defense-in-depth check on top of middleware
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const demoUser = getDemoSession()

  // Demo mode check
  if (demoUser) {
    if (demoUser.role !== "admin") {
      console.warn("[v0] Demo user without admin role attempting admin access:", demoUser.email)
      return redirect("/403")
    }

    console.log("[v0] Demo admin access granted:", demoUser.email)
    return <>{children}</>
  }

  // Production: verify global admin status server-side
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return redirect("/login")
  }

  const userId = session.user.id

  // Check if user exists in admin_users table
  const { data: adminUser, error: queryError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (queryError) {
    console.error("[v0] Error checking admin status in layout:", queryError)
    return redirect("/login")
  }

  if (!adminUser) {
    console.warn("[v0] User is not a global admin:", userId)
    return redirect("/403")
  }

  console.log("[v0] Admin layout access granted:", userId)

  return <>{children}</>
}
