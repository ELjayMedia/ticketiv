import type React from "react"
import { redirect } from "next/navigation"
import { organizerRoleLabel } from "@ticketiv/shared"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { OrgSidebar, OrgTopTabs } from "@/components/quiet/shell/org-nav"
import { getOrganizerAccess } from "@/lib/organizer/access"

/**
 * Org-scoped layout for /orgs/[orgId]/…
 *
 * Admits anyone with an organizer role in this org (ADR 0002): members,
 * people assigned to one of its events (door staff, scanners) and platform
 * admins. Frames every page with the workspace navigation for that role
 * (sidebar on desktop, sticky section tabs on phones). Each page then checks
 * its own section with requireOrganizerSection / requireEventManager.
 */
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

  const access = await getOrganizerAccess(orgId)
  if (!access) return redirect("/403")

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).maybeSingle()
  const roleLabel = access.storedRole
    ? organizerRoleLabel(access.storedRole)
    : access.isPlatformAdmin
      ? "Platform admin"
      : organizerRoleLabel(access.role === "scanner" ? "scanner" : "organizer_staff")

  const navProps = {
    orgId,
    orgName: org?.name ?? "Your organisation",
    roleLabel,
    role: access.role,
    storedRole: access.storedRole,
    isPlatformAdmin: access.isPlatformAdmin,
  }

  return (
    <div className="min-h-dvh bg-bg md:flex">
      <OrgSidebar {...navProps} />
      <OrgTopTabs {...navProps} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
