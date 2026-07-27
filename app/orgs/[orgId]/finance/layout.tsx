import { redirect } from "next/navigation"

import { requireOrgCapability } from "@/lib/data/organizer/access"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function OrgFinanceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params
  const returnPath = `/orgs/${orgId}/finance`
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  await requireOrgCapability(orgId, "payouts")
  return children
}
