import { redirect } from "next/navigation"

import { EventOperationsClient } from "./operations-client"
import { createServerSupabaseClient } from "@/lib/supabase-server"

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

  return <EventOperationsClient orgId={orgId} eventId={eventId} />
}
