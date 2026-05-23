import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { getDemoOrganizerEvents, getDemoOrganization } from "@/lib/demo-data"
import { getOrgEventKPIs } from "@/lib/adapters/kpis"
import DashboardCharts from "./dashboard-charts"

export const dynamic = "force-dynamic"

interface DashboardMetric {
  label: string
  value: string
  change?: string
  icon: IconName
}

function MetricCard({ label, value, change, icon }: DashboardMetric) {
  return (
    <Card className="transition-colors hover:border-line-2">
      <CardBody className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-label">{label}</span>
          <Icon name={icon} size={16} className="text-ink-3" />
        </div>
        <p className="font-mono text-[24px] font-semibold tabular-nums text-ink">{value}</p>
        {change && (
          <p className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3">
            <Icon name="arrowUR" size={12} />
            {change}
          </p>
        )}
      </CardBody>
    </Card>
  )
}

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let events: any[] = []
  let kpis: any[] = []
  let orgName = "Organization"
  let totalTicketsSold = 0
  let totalRevenue = 0
  let totalCheckedIn = 0
  let activeEvents = 0

  if (demoSessionCookie) {
    try {
      const org: any = getDemoOrganization(orgId)
      if (!org) return redirect("/403")
      orgName = org.name
      events = getDemoOrganizerEvents(orgId)

      kpis = events.map((event) => ({
        event_id: event.id,
        event_title: event.title,
        event_date: event.starts_at,
        total_tickets_sold: Math.floor(Math.random() * 300) + 20,
        total_checked_in: Math.floor(Math.random() * 200) + 10,
        total_revenue_cents: Math.floor(Math.random() * 50000) + 5000,
        attendance_rate: Math.random() * 0.8,
      }))

      totalTicketsSold = kpis.reduce((sum, kpi) => sum + kpi.total_tickets_sold, 0)
      totalRevenue = kpis.reduce((sum, kpi) => sum + kpi.total_revenue_cents, 0)
      totalCheckedIn = kpis.reduce((sum, kpi) => sum + kpi.total_checked_in, 0)
      activeEvents = events.filter((e) => e.status === "published").length
    } catch {
      /* fall through */
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) return redirect("/login")

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return redirect("/login")

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, id")
      .eq("id", orgId)
      .maybeSingle()
    if (orgError || !org) return redirect("/403")

    orgName = (org as any).name
    kpis = await getOrgEventKPIs(orgId)

    const { data: eventsData = [] } = await supabase
      .from("events")
      .select("id, title, status, starts_at")
      .eq("org_id", orgId)

    events = (eventsData ?? []) as any[]
    totalTicketsSold = kpis.reduce((sum, kpi) => sum + kpi.total_tickets_sold, 0)
    totalRevenue = kpis.reduce((sum, kpi) => sum + kpi.total_revenue_cents, 0)
    totalCheckedIn = kpis.reduce((sum, kpi) => sum + kpi.total_checked_in, 0)
    activeEvents = events.filter((e) => e.status === "published").length
  }

  const upcomingEvents = events.filter((e) => e.status === "published").slice(0, 5)
  const attendancePct =
    totalTicketsSold > 0 ? `${((totalCheckedIn / totalTicketsSold) * 100).toFixed(0)}%` : "0%"

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">{orgName} dashboard</h1>
            <p className="text-[13px] text-ink-3">Welcome back. Here’s your event overview.</p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Link
              href={`/orgs/${orgId}/series`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg sm:w-auto"
            >
              Series
            </Link>
            <Link
              href={`/orgs/${orgId}/events/new`}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2 sm:w-auto"
            >
              <Icon name="plus" size={14} />
              Create event
            </Link>
          </div>
        </div>

        {events.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Active events"
              value={activeEvents.toString()}
              change={`${events.length} total`}
              icon="cal"
            />
            <MetricCard
              label="Tickets sold"
              value={totalTicketsSold.toString()}
              change={`${totalCheckedIn} checked in`}
              icon="ticket"
            />
            <MetricCard
              label="Total revenue"
              value={`$${(totalRevenue / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              change={`${attendancePct} attendance`}
              icon="wallet"
            />
            <MetricCard
              label="Avg check-in"
              value={attendancePct}
              change="Attendance rate"
              icon="check"
            />
          </div>
        )}

        {events.length > 0 && kpis.length > 0 && <DashboardCharts kpis={kpis} />}

        {events.length === 0 ? (
          <Card flat className="border-dashed">
            <CardBody className="flex flex-col items-center gap-4 px-4 py-16 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="zap" size={28} />
              </span>
              <div className="flex max-w-sm flex-col items-center gap-2">
                <h2 className="text-h1">Create your first event</h2>
                <p className="text-[13px] text-ink-3">
                  Get started by creating an event and start selling tickets to your audience. Our simple wizard will guide you through the process.
                </p>
              </div>
              <Link
                href={`/orgs/${orgId}/events/new`}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
              >
                Create event
              </Link>
            </CardBody>
          </Card>
        ) : (
          <section className="flex flex-col gap-4">
            <h2 className="text-h2">Recent events</h2>
            <div className="flex flex-col gap-3">
              {upcomingEvents.map((event) => {
                const eventKpi = kpis.find((k) => k.event_id === event.id)
                return (
                  <Link key={event.id} href={`/orgs/${orgId}/events/${event.id}`} className="block">
                    <Card className="transition-colors hover:border-line-2">
                      <CardBody className="flex items-center justify-between gap-4 p-4">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <h3 className="truncate text-[14px] font-semibold text-ink">{event.title}</h3>
                          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
                            <Icon name="cal" size={12} />
                            {event.starts_at && new Date(event.starts_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="hidden flex-col items-end gap-0.5 sm:flex">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Sold</p>
                            <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                              {eventKpi?.total_tickets_sold || 0}
                            </p>
                          </div>
                          <div className="hidden flex-col items-end gap-0.5 sm:flex">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Revenue</p>
                            <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                              ${((eventKpi?.total_revenue_cents || 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Check-in</p>
                            <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                              {eventKpi?.total_checked_in || 0}
                            </p>
                          </div>
                          <Chip size="sm" variant={event.status === "published" ? "active" : "muted"} className="capitalize">
                            {event.status}
                          </Chip>
                        </div>
                      </CardBody>
                    </Card>
                  </Link>
                )
              })}
            </div>
            {events.length > 5 && (
              <Link
                href={`/orgs/${orgId}/events`}
                className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
              >
                View all events ({events.length})
              </Link>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
