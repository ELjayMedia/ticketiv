import { redirect } from "next/navigation"

import { EventOperationsClient } from "./operations-client"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase/admin"

interface OperationsPageProps {
  params: Promise<{ orgId: string; eventId: string }>
}

export default async function EventOperationsPage({ params }: OperationsPageProps) {
  const { orgId, eventId } = await params
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect(`/login?redirectTo=${encodeURIComponent(`/orgs/${orgId}/events/${eventId}/operations`)}`)

  const admin = createAdminClient()
  const [{ data: member }, { data: globalAdmin }] = await Promise.all([
    admin
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", session.user.id)
      .maybeSingle(),
    admin
      .from("admin_users")
      .select("user_id")
      .eq("user_id", session.user.id)
      .eq("active", true)
      .maybeSingle(),
  ])

  const canManageStatus =
    globalAdmin !== null ||
    member?.role === "organizer_owner" ||
    member?.role === "organizer_admin"

  return (
    <EventOperationsClient
      orgId={orgId}
      eventId={eventId}
      canManageStatus={canManageStatus}
    />
  )
}
