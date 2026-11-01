import type React from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { OrgSidebar, OrgTopTabs } from "@/components/quiet/shell/org-nav"
import { ORGANIZER_MANAGER_ROLES } from "@/lib/org-management"

/**
 * Org-scoped layout
 * Enforces that user is a member of the org before accessing any subroutes
 * e.g., /orgs/[orgId]/dashboard, /orgs/[orgId]/members, /orgs/[orgId]/settings, etc.
 * and frames every page with the workspace navigation (sidebar on desktop,
 * sticky section tabs on phones).
 */

const ROLE_LABELS: Record<string, string> = {
  organizer_owner: "Owner",
  organizer_admin: "Admin",
  admin: "Admin",
  organizer: "Organizer",
  organizer_staff: "Door staff",
  staff: "Staff",
  scanner: "Scanner",
  member: "Member",
}
export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect("/login")

  const { data: membership, error: queryError } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (queryError) {
    console.error("[v0] Error checking org membership in layout:", queryError)
    return redirect("/login")
  }

  if (!membership) {
    // Platform admins manage every org workspace (the DB RLS already treats them
    // as org managers via app.is_platform_admin()). Allow them through without an
    // org_members row.
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .maybeSingle()

    if (!adminRow) {
      const { data: doorStaff } = await supabase
        .from("event_staff")
        .select("event_id, events!inner(org_id)")
        .eq("user_id", user.id)
        .eq("active", true)
        .eq("events.org_id", orgId)
        .limit(1)
        .maybeSingle()

      if (doorStaff) return redirect("/scan")
      return redirect("/403")
    }
  }

  const role = membership?.role ? String(membership.role) : null
  const isOwner = role === "organizer_owner"
  // No membership row here means a platform admin (door staff and others
  // were redirected above); they manage every workspace.
  const canManage = role === null || ORGANIZER_MANAGER_ROLES.has(role)

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle()
  const navProps = {
    orgId,
    orgName: org?.name ?? "Your organisation",
    roleLabel: role ? (ROLE_LABELS[role] ?? null) : "Platform admin",
    canManage,
    isOwner,
  }

  return (
    <div className="min-h-dvh bg-bg md:flex">
      <OrgSidebar {...navProps} />
      <OrgTopTabs {...navProps} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
