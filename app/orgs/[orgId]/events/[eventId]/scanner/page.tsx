import { redirect } from "next/navigation"

import { ScannerClient } from "./scanner-client"
import { createServerSupabaseClient } from "@/lib/supabase-server"

interface ScannerPageProps {
  params: Promise<{ orgId: string; eventId: string }>
}

export default async function ScannerPage({ params }: ScannerPageProps) {
  const { orgId, eventId } = await params
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect("/sign-in")

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect(`/sign-in?redirectTo=${encodeURIComponent(`/orgs/${orgId}/events/${eventId}/scanner`)}`)

  return <ScannerClient orgId={orgId} eventId={eventId} />
}
