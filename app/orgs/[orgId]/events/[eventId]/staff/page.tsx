import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
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

  // The staff API resolves emails via the auth admin API, so the initial list
  // is loaded server-side with the admin client for parity (and so scanners
  // can still see the roster read-only).
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
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/orgs/${orgId}/events/${eventId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Event staff</h1>
            <p className="text-muted-foreground mt-1">{event.title}</p>
          </div>
        </div>

        <EventStaffClient eventId={eventId} canManage={canManage} initialStaff={initialStaff} />
      </div>
    </main>
  )
}
