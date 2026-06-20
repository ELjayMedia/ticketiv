import type React from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Org-scoped layout
 * Enforces that user is a member of the org before accessing any subroutes
 * e.g., /orgs/[orgId]/dashboard, /orgs/[orgId]/members, /orgs/[orgId]/settings, etc.
 */
export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  // Verify org membership server-side
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

  // Check if user is a member of this org
  const { data: membership, error: queryError } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (queryError) {
    console.error("[v0] Error checking org membership in layout:", queryError)
    return redirect("/login")
  }

  if (!membership) {
    console.warn("[v0] User is not a member of org:", userId, orgId)
    return redirect("/403")
  }

  console.log("[v0] Org layout access granted. User role:", membership.role)

  return <>{children}</>
}
