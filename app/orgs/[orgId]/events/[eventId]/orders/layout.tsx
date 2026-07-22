import { redirect } from "next/navigation"

import { requireOrgCapability } from "@/lib/data/organizer/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function EventOrdersLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string; eventId: string }>
}) {
  const { orgId, eventId } = await params
  const returnPath = `/orgs/${orgId}/events/${eventId}/orders`
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  await requireOrgCapability(orgId, "manage")
  return children
}
