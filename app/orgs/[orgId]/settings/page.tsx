import Link from "next/link"
import { redirect } from "next/navigation"

import { Icon } from "@/components/quiet/ui/icon"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getMyOrgCapabilities } from "@/lib/data/organizer/access"
import { DeleteWorkspacePanel } from "../dashboard/delete-workspace-panel"

export const dynamic = "force-dynamic"

export default async function WorkspaceSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ deleteError?: string }>
}) {
  const { orgId } = await params
  const { deleteError } = await searchParams
  const returnPath = `/orgs/${orgId}/settings`
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  const caps = await getMyOrgCapabilities(orgId)
  if (caps.role !== "organizer_owner") redirect(`/orgs/${orgId}/dashboard`)

  const [orgResult, eventsResult] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", orgId).maybeSingle(),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ])

  const org = orgResult.data
  if (!org) redirect("/403")

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex max-w-3xl flex-col gap-8 p-6">
        <div>
          <Link href={`/orgs/${orgId}/dashboard`} className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
            <Icon name="chevL" size={14} /> Back to dashboard
          </Link>
          <h1 className="text-h1">Workspace settings</h1>
          <p className="mt-1 text-[13px] text-ink-3">Manage permanent settings for {org.name}.</p>
        </div>

        <DeleteWorkspacePanel
          orgId={orgId}
          orgName={org.name}
          eventCount={eventsResult.count ?? 0}
          error={deleteError ? decodeURIComponent(deleteError) : undefined}
        />
      </div>
    </main>
  )
}
