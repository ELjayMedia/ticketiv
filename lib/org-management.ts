import "server-only"

import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const ORGANIZER_MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

const EVENT_MANAGER_ROLES = new Set(["organizer_owner", "organizer_admin", "admin", "organizer"])

type ManagedEvent = {
  id: string
  org_id: string
  title?: string | null
  description?: string | null
  starts_at?: string | null
  status?: string | null
  cover_image_url?: string | null
  venue_id?: string | null
}

export async function requireOrganizerEventManager<TEvent extends ManagedEvent = ManagedEvent>(
  orgId: string,
  eventId: string,
  select = "id, title, starts_at, status, cover_image_url, description, org_id",
): Promise<{ userId: string; event: TEvent }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  // Verify the user against Supabase Auth rather than trusting a potentially
  // stale session object after a client-side RPC and redirect.
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect("/login")

  const admin = createAdminClient()
  const { data: event, error } = await admin
    .from("events")
    .select(select)
    .eq("id", eventId)
    .maybeSingle<TEvent>()

  if (error || !event || event.org_id !== orgId) redirect("/403")

  const { data: globalAdmin } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (globalAdmin) return { userId: user.id, event }

  const { data: member } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (member?.role && ORGANIZER_MANAGER_ROLES.has(String(member.role))) {
    return { userId: user.id, event }
  }

  // Event creators are inserted into event_staff by create_event_draft().
  // Honour that explicit event-level access even if organization membership
  // has not yet propagated to the page request.
  const { data: staff } = await admin
    .from("event_staff")
    .select("role, active")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle()

  if (staff?.role && EVENT_MANAGER_ROLES.has(String(staff.role))) {
    return { userId: user.id, event }
  }

  redirect("/403")
}