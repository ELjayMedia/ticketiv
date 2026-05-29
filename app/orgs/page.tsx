import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Icon } from "@/components/quiet/ui/icon"
import { Logo } from "@/components/Logo"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"
export const metadata = { title: "Choose organisation" }

/**
 * Organisation picker. The single entry point for users who belong to more
 * than one organisation; `resolve-org` sends them here. Users with zero orgs
 * are routed to onboarding and users with exactly one go straight to its
 * dashboard, so this page only renders a list when there's a real choice.
 */
export default async function OrgPickerPage() {
  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: memberships } = await supabase
    .from("org_members")
    .select("role, organizations(id, name, slug, logo)")
    .eq("user_id", session.user.id)

  const orgs = (memberships ?? [])
    .map((m: any) => ({ role: m.role as string, org: m.organizations }))
    .filter((m) => m.org)

  if (orgs.length === 0) redirect("/onboarding/organizer")
  if (orgs.length === 1) redirect(`/orgs/${orgs[0].org.id}/dashboard`)

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col px-6 py-10">
      <header>
        <Logo />
      </header>

      <section className="mt-12 flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Organisations</p>
          <h1 className="text-h1">Choose an organisation</h1>
          <p className="text-[13px] text-ink-3">You belong to {orgs.length} organisations. Pick one to manage.</p>
        </div>

        <div className="flex flex-col gap-2">
          {orgs.map(({ org, role }) => (
            <Link key={org.id} href={`/orgs/${org.id}/dashboard`} className="block">
              <Card className="transition-colors hover:border-line-2">
                <CardBody className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-line bg-bg">
                    {org.logo ? (
                      <img src={org.logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Icon name="user" size={16} className="text-ink-3" />
                    )}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[14px] font-semibold text-ink">{org.name}</span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                      {String(role).replace(/_/g, " ")}
                    </span>
                  </div>
                  <Icon name="arrowR" size={16} className="shrink-0 text-ink-3" />
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>

        <Link
          href="/onboarding/organizer"
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
        >
          <Icon name="plus" size={14} />
          Create a new organisation
        </Link>
      </section>
    </main>
  )
}
