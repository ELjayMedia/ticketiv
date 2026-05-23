import { redirect } from "next/navigation"
import Link from "next/link"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Icon } from "@/components/quiet/ui/icon"
import { EventStaffClient, type StaffMember } from "./staff-client"

export const dynamic = "force-dynamic"

const MANAGER_ROLES = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])

export default async function EventStaffPage({ params }: { params: { orgId: string; eventId: string } }) {
  const { orgId, eventId } = params

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) redirect("/403")

  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  const canManage = Boolean(member?.role && MANAGER_ROLES.has(String(member.role)))

  const admin = createAdminClient()
  const { data: rows } = await admin
    .from("event_staff")
    .select("user_id, role, active, created_at")
    .eq("event_id", eventId)
    .eq("active", true)
    .order("created_at", { ascending: true })

  const initialStaff: StaffMember[] = await Promise.all(
    (rows ?? []).map(async (row) => {
      const { data: authUser } = await admin.auth.admin.getUserById(row.user_id)
      return {
        user_id: row.user_id,
        role: String(row.role),
        email: authUser?.user?.email ?? null,
      }
    }),
  )

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/orgs/${orgId}/events/${eventId}`}
            aria-label="Back to event"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
          >
            <Icon name="chevL" size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">Event staff</h1>
            <p className="text-[13px] text-ink-3">{event.title}</p>
          </div>
        </div>

        <EventStaffClient eventId={eventId} canManage={canManage} initialStaff={initialStaff} />
      </div>
    </main>
  )
}
