import "server-only"

import type { createAdminClient } from "@/lib/supabase/admin"

// Who may edit an event through the event editor's API routes, besides
// platform admins (each route checks those itself): the organisation's
// managers, and the event's own admin (event_staff role organizer_admin, e.g.
// assigned from the command centre). Mirrors lib/organizer/resolve.ts, where
// an organizer_admin event assignment lets that person manage that one event.

const ORG_MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

type AdminClient = ReturnType<typeof createAdminClient>

export async function isEventManager(admin: AdminClient, event: { id: string; org_id: string }, userId: string): Promise<boolean> {
  const [{ data: member }, { data: staff }] = await Promise.all([
    admin.from("org_members").select("role").eq("org_id", event.org_id).eq("user_id", userId).maybeSingle(),
    admin.from("event_staff").select("role").eq("event_id", event.id).eq("user_id", userId).eq("active", true).maybeSingle(),
  ])
  if (member?.role && ORG_MANAGER_ROLES.has(String(member.role))) return true
  return String(staff?.role ?? "") === "organizer_admin"
}
