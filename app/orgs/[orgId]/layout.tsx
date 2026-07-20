import type React from "react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { Icon } from "@/components/quiet/ui/icon"

/**
 * Org-scoped layout
 * Enforces that user is a member of the org before accessing any subroutes
 * e.g., /orgs/[orgId]/dashboard, /orgs/[orgId]/members, /orgs/[orgId]/settings, etc.
 */
export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return redirect("/login")

  const { data: membership, error: queryError } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .maybeSingle()

  if (queryError) {
    console.error("[v0] Error checking org membership in layout:", queryError)
    return redirect("/login")
  }

  if (!membership) {
    const { data: doorStaff } = await supabase
      .from("event_staff")
      .select("event_id, events!inner(org_id)")
      .eq("user_id", user.id)
      .eq("active", true)
      .eq("events.org_id", orgId)
      .limit(1)
      .maybeSingle()

    if (doorStaff) return redirect("/scan")
    return redirect("/403")
  }

  const isOwner = membership.role === "organizer_owner"

  return (
    <>
      {children}
      {isOwner && (
        <Link
          href={`/orgs/${orgId}/settings`}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink shadow-lg hover:bg-bg"
          aria-label="Workspace settings"
        >
          <Icon name="settings" size={15} />
          Workspace settings
        </Link>
      )}
    </>
  )
}
