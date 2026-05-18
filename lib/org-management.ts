import "server-only"

import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const ORGANIZER_MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

type ManagedEvent = {
  id: string
  org_id: string
  title?: string | null
  description?: string | null
  date?: string | null
  status?: string | null
  cover_image_url?: string | null
  venue_id?: string | null
}

export async function requireOrganizerEventManager<TEvent extends ManagedEvent = ManagedEvent>(
  orgId: string,
  eventId: string,
  select = "id, title, date, status, cover_image_url, description, org_id",
): Promise<{ userId: string; event: TEvent }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect("/login")

  const admin = createAdminClient()
  const { data: event, error } = await admin
    .from("events")
    .select(select)
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle<TEvent>()

  if (error || !event) redirect("/403")

  const { data: globalAdmin } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .eq("active", true)
    .maybeSingle()

  if (globalAdmin) return { userId: session.user.id, event }

  const { data: member } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (!member?.role || !ORGANIZER_MANAGER_ROLES.has(String(member.role))) redirect("/403")

  return { userId: session.user.id, event }
}
