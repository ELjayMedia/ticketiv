import "server-only"

import { EVENT_MANAGER_ROLES, ORGANIZER_MANAGER_ROLES } from "@/lib/org-management"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getAuthenticatedUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return error ? null : (user?.id ?? null)
}

export async function loadEventManageContext(
  admin: ReturnType<typeof createAdminClient>,
  eventId: string,
  userId: string,
  select: string,
): Promise<{ allowed: boolean; event: any | null }> {
  const { data, error } = await admin
    .from("events")
    .select(select)
    .eq("id", eventId)
    .maybeSingle()

  if (error) throw error

  const event = data as any | null
  if (!event) return { allowed: false, event: null }

  const [{ data: globalAdmin }, { data: member }, { data: staff }] = await Promise.all([
    admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
    admin
      .from("org_members")
      .select("role")
      .eq("org_id", event.org_id)
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("event_staff")
      .select("role, active")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .eq("active", true)
      .maybeSingle(),
  ])

  const allowed =
    Boolean(globalAdmin) ||
    Boolean(member?.role && ORGANIZER_MANAGER_ROLES.has(String(member.role))) ||
    Boolean(staff?.role && EVENT_MANAGER_ROLES.has(String(staff.role)))

  return { allowed, event }
}
