import type React from "react"
import { redirect } from "next/navigation"
import { WorkspaceShell } from "@/components/quiet/shell/workspace-shell"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Organizer workspace layout
 * Enforces that user must be a member of at least one org
 * This prevents users from accessing organizer routes without org membership
 */
export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  // Verify org membership server-side
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured for organizer layout")
    return redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    console.log("[v0] No session for organizer layout, redirecting to login")
    return redirect("/login")
  }

  const userId = session.user.id

  // Check if user has at least one org membership
  const { data: orgMemberships, error: queryError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userId)
    .limit(1)

  if (queryError) {
    console.error("[v0] Error checking org membership in layout:", queryError)
    return redirect("/login")
  }

  if (!orgMemberships || orgMemberships.length === 0) {
    console.warn("[v0] User has no org membership, denying organizer access:", userId)
    return redirect("/403")
  }

  console.log("[v0] Organizer layout access granted. User has", orgMemberships.length, "org(s)")

  return (
    <WorkspaceShell workspace="organizer" requireAuth>
      {children}
    </WorkspaceShell>
  )
}
