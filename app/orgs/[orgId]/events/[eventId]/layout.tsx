import type React from "react"
import { redirect } from "next/navigation"

import { ORGANIZER_MANAGER_ROLES } from "@/lib/org-management"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Event workspace layout.
 *
 * Allows platform admins, organizer managers, and active event staff while
 * confirming that the event belongs to the organization in the URL.
 */
export default async function EventWorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ orgId: string; eventId: string }>
  children: React.ReactNode
}) {
  const { orgId, eventId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect("/login")

  // Use the server-only admin client after authenticating the caller. The
  // event_staff table is intentionally hidden from direct authenticated reads,
  // so an RLS-backed lookup here would incorrectly deny legitimate staff.
  const admin = createAdminClient()

  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event || event.org_id !== orgId) redirect("/403")

  const { data: globalAdmin } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (globalAdmin) return <>{children}</>

  const { data: orgMember } = await admin
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (orgMember?.role && ORGANIZER_MANAGER_ROLES.has(String(orgMember.role))) {
    return <>{children}</>
  }

  const { data: eventStaff } = await admin
    .from("event_staff")
    .select("role")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .eq("active", true)
    .maybeSingle()

  if (eventStaff) return <>{children}</>

  console.warn("[event-workspace] User denied event access:", user.id, eventId)
  redirect("/403")
}
