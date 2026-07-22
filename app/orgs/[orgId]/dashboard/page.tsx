import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { OnboardingChecklist } from "@/components/quiet/screens/organizer/onboarding-checklist"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getMyOrgCapabilities } from "@/lib/data/organizer/access"
import { buildOrganizerSetupSteps, needsOrganizerSetup } from "@/lib/data/organizer/readiness"
import { getOrgEventKPIs } from "@/lib/adapters/kpis"
import DashboardCharts from "./dashboard-charts"

export const dynamic = "force-dynamic"

export default async function OrgDashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const returnPath = `/orgs/${orgId}/dashboard`
  const supabase = createServerSupabaseClient()

  if (!supabase) return redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return redirect(`/login?next=${encodeURIComponent(returnPath)}`)

  const caps = await getMyOrgCapabilities(orgId)
  if (!caps.role) return redirect("/403")

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name, bio, logo, default_currency")
    .eq("id", orgId)
    .maybeSingle()

  if (orgError || !org) return redirect("/403")

  const [eventsRes, payoutAccountsRes, staffRes, devicesRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, status, starts_at")
      .eq("org_id", orgId)
      .order("starts_at", { ascending: false }),
    supabase.from("payout_accounts").select("id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("org_members").select("user_id", { count: "exact", head: true }).eq("org_id", orgId),
    supabase.from("devices").select("id", { count: "exact", head: true }).eq("org_id", orgId),
  ])

  const events = (eventsRes.data ?? []) as Array<{
    id: string
    title: string
    status: string
    starts_at: string | null
  }>
  const kpis = await getOrgEventKPIs(orgId)
  const publishedEvents = events.filter((event) => event.status === "published")
  const recentEvents = events.slice(0, 5)

  let financeSummaryGrossCents: number | null = null
  if (caps.payouts) {
    try {
      const { data: financeData, error: financeError } = await supabase.rpc("fn_org_finance_summary", {
        p_org_id: orgId,
      })
      if (!financeError && financeData && typeof financeData === "object") {
        const data = financeData as Record<string, unknown>
        if (typeof data.gross_cents === "number") financeSummaryGrossCents = data.gross_cents
      }
    } catch {
      // Finance is non-fatal on the general workspace dashboard.
    }
  }

  let totalTicketsSold = 0
  let totalCheckedIn = 0

  if (events.length > 0) {
    const { data: liveStats } = await supabase
      .from("event_live_stats")
      .select("tickets_sold, checked_in_count")
      .in(
        "event_id",
        events.map((event) => event.id),
      )

    for (const stat of liveStats ?? []) {
      totalTicketsSold += stat.tickets_sold ?? 0
      totalCheckedIn += stat.checked_in_count ?? 0
    }
  }

  const grossCents = financeSummaryGrossCents
  const avgTicketCents =
    grossCents !== null && totalTicketsSold > 0 ? Math.round(grossCents / totalTicketsSold) : null

  const missingProfileFields = [!org.bio ? "bio" : null, !org.logo ? "logo" : null].filter(Boolean)
  const staffCount = staffRes.count ?? 0
  const setupSteps = buildOrganizerSetupSteps({
    orgId,
    hasProfile: missingProfileFields.length === 0,
    hasPayoutAccount: (payoutAccountsRes.count ?? 0) > 0,
    hasEvent: events.length > 0,
    hasDevice: (devicesRes.count ?? 0) > 0,
    hasTeam: staffCount > 1,
  }).filter((step) => {
    if (step.id === "payout") return caps.payouts
    if (step.id === "profile" || step.id === "event") return caps.manage
    if (step.id === "scanner" || step.id === "team") return caps.staff || caps.manage
    return true
  })
  const needsOnboarding = needsOrganizerSetup(setupSteps)

  const workspaceLinks = [
    {
      label: "Events",
      description: "Create events and open their management dashboards.",
      href: `/orgs/${orgId}/events`,
      icon: "cal",
      visible: caps.manage,
    },
    {
      label: "Finance",
      description: "Review sales, balances and payout activity.",
      href: `/orgs/${orgId}/finance`,
      icon: "wallet",
      visible: caps.payouts,
    },
    {
      label: "Workspace settings",
      description: "Manage owner-only permanent workspace settings.",
      href: `/orgs/${orgId}/settings`,
      icon: "settings",
      visible: caps.role === "organizer_owner",
    },
  ].filter((item) => item.visible)

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-h1">{org.name}</h1>
              <Chip size="sm" variant="muted" className="capitalize">
                {String(caps.role).replaceAll("_", " ")}
              </Chip>
            </div>
            <p className="text-[13px] text-ink-3">
              {events.length > 0 ? "Welcome back. Here's your event overview." : "Let's get your first event live."}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            {caps.payouts && (
              <Link href={`/orgs/${orgId}/finance`} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-bg">
                <Icon name="wallet" size={14} /> Finance
              </Link>
            )}
            {caps.manage && (
              <Link href={`/orgs/${orgId}/events/new`} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface hover:bg-ink-2">
                <Icon name="plus" size={14} /> New event
              </Link>
            )}
          </div>
        </div>

        {workspaceLinks.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-h2">Workspace</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {workspaceLinks.map((item) => (
                <Link key={item.href} href={item.href} className="block">
                  <Card className="h-full transition-colors hover:border-line-2">
                    <CardBody className="flex h-full items-start gap-3 p-5">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg text-ink-2">
                        <Icon name={item.icon as any} size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-[14px] font-semibold text-ink">{item.label}</h3>
                        <p className="mt-1 text-[12px] leading-relaxed text-ink-3">{item.description}</p>
                      </div>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Revenue" value={grossCents !== null ? `SZL ${(grossCents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}` : "—"} icon="wallet" />
          <Metric label="Tickets sold" value={totalTicketsSold.toLocaleString()} icon="ticket" />
          <Metric label="Events" value={events.length.toLocaleString()} icon="cal" />
          <Metric label="Avg. ticket" value={avgTicketCents !== null ? `SZL ${(avgTicketCents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}` : "—"} icon="trending" />
        </div>

        {needsOnboarding && setupSteps.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h2">Finish setting up {org.name}</h2>
              <Chip size="sm" variant="muted">Setup</Chip>
            </div>
            <OnboardingChecklist orgId={orgId} steps={setupSteps} />
          </div>
        )}

        {events.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Active events" value={publishedEvents.length.toString()} icon="cal" />
            <Metric label="Tickets sold" value={totalTicketsSold.toLocaleString()} icon="ticket" />
            <Metric label="Gross sales" value={grossCents !== null ? `SZL ${(grossCents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}` : "—"} icon="wallet" />
            <Metric label="Checked in" value={totalCheckedIn.toLocaleString()} icon="check" />
          </div>
        )}

        {events.length > 0 && kpis.length > 0 && <DashboardCharts kpis={kpis} currency={org.default_currency ?? "SZL"} />}

        {events.length > 0 ? (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h2">Recent events</h2>
              {caps.manage && <Link href={`/orgs/${orgId}/events`} className="text-[13px] font-semibold text-accent hover:underline">View all events</Link>}
            </div>
            <div className="flex flex-col gap-3">
              {recentEvents.map((event) => (
                <Link key={event.id} href={`/orgs/${orgId}/events/${event.id}`} className="block">
                  <Card className="transition-colors hover:border-line-2">
                    <CardBody className="flex items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="truncate text-[14px] font-semibold text-ink">{event.title}</h3>
                        <p className="text-[12px] text-ink-3">{event.starts_at ? new Date(event.starts_at).toLocaleDateString() : "Date pending"}</p>
                      </div>
                      <Chip size="sm" variant={event.status === "published" ? "active" : "muted"} className="capitalize">{event.status}</Chip>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <Card flat className="border-dashed">
            <CardBody className="flex flex-col items-center gap-4 p-8 text-center">
              <Icon name="cal" size={30} className="text-ink-4" />
              <div>
                <h2 className="text-h2">No events yet</h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  {caps.manage ? "Create your first event to start selling tickets." : "An owner or admin needs to create the workspace's first event."}
                </p>
              </div>
              {caps.manage && (
                <Link href={`/orgs/${orgId}/events/new`} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface hover:bg-ink-2">
                  <Icon name="plus" size={14} /> Create event
                </Link>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-label">{label}</span>
          <Icon name={icon} size={16} className="text-ink-3" />
        </div>
        <p className="font-mono text-[24px] font-semibold tabular-nums text-ink">{value}</p>
      </CardBody>
    </Card>
  )
}
