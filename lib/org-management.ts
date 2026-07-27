import "server-only"

import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const ORGANIZER_MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

const EVENT_MANAGER_ROLES = new Set(["organizer_owner", "organizer_admin", "admin", "organizer"])
const EVENT_SCANNER_ROLES = new Set([
  "scanner",
  "organizer_staff",
  "organizer_admin",
  "organizer_owner",
  "admin",
  "organizer",
])

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

async function resolveAuthenticatedEvent<TEvent extends ManagedEvent>(
  orgId: string,
  eventId: string,
  select: string,
): Promise<{ userId: string; event: TEvent; admin: ReturnType<typeof createAdminClient> }> {
  const returnTo = `/orgs/${orgId}/events/${eventId}`
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect(`/login?next=${encodeURIComponent(returnTo)}`)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) redirect(`/login?next=${encodeURIComponent(returnTo)}`)

  const admin = createAdminClient()
  const { data: event, error } = await admin
    .from("events")
    .select(select)
    .eq("id", eventId)
    .maybeSingle<TEvent>()

  if (error || !event || event.org_id !== orgId) redirect("/403")

  return { userId: user.id, event, admin }
}

async function isGlobalAdmin(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()
  return Boolean(data)
}

export async function requireOrganizerEventManager<TEvent extends ManagedEvent = ManagedEvent>(
  orgId: string,
  eventId: string,
  select = "id, title, starts_at, status, cover_image_url, description, org_id",
): Promise<{ userId: string; event: TEvent }> {
  const { userId, event, admin } = await resolveAuthenticatedEvent<TEvent>(orgId, eventId, select)

  if (await isGlobalAdmin(admin, userId)) return { userId, event }

  const { data: member } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()

  if (member?.role && ORGANIZER_MANAGER_ROLES.has(String(member.role))) return { userId, event }

  const { data: staff } = await admin
    .from("event_staff")
    .select("role, active")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()

  if (staff?.role && EVENT_MANAGER_ROLES.has(String(staff.role))) return { userId, event }

  redirect("/403")
}

export async function requireEventScannerAccess<TEvent extends ManagedEvent = ManagedEvent>(
  orgId: string,
  eventId: string,
  select = "id, title, starts_at, status, org_id",
): Promise<{ userId: string; event: TEvent; accessRole: string }> {
  const scannerReturnTo = `/orgs/${orgId}/events/${eventId}/scanner`
  const { userId, event, admin } = await resolveAuthenticatedEvent<TEvent>(orgId, eventId, select)

  if (await isGlobalAdmin(admin, userId)) return { userId, event, accessRole: "admin" }

  const { data: member } = await admin
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()

  if (member?.role && ORGANIZER_MANAGER_ROLES.has(String(member.role))) {
    return { userId, event, accessRole: String(member.role) }
  }

  const { data: staff } = await admin
    .from("event_staff")
    .select("role, active")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle()

  if (staff?.role && EVENT_SCANNER_ROLES.has(String(staff.role))) {
    return { userId, event, accessRole: String(staff.role) }
  }

  redirect(`/403?next=${encodeURIComponent(scannerReturnTo)}`)
}
