import type React from "react"
import { redirect } from "next/navigation"

import { canWorkEvent, getOrganizerAccess } from "@/lib/organizer/access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Event workspace layout.
 *
 * Allows anyone who may work this event (platform admins, org members with an
 * organizer role, and active event staff) while confirming that the event
 * belongs to the organization in the URL.
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

  // Org members with an organizer role work every event; event staff only
  // the events they are assigned to (ADR 0002). Pages check their section.
  const access = await getOrganizerAccess(orgId)
  if (access && canWorkEvent(access, eventId)) return <>{children}</>

  console.warn("[event-workspace] User denied event access:", user.id, eventId)
  redirect("/403")
}
