import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { getOrgEventKPIs } from "@/lib/adapters/kpis"
import DashboardCharts from "./dashboard-charts"

export const dynamic = "force-dynamic"

// TICK-47 — Org onboarding + dashboard entry state

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

interface OnboardingStep {
  key: string
  label: string
  description: string
  href: string
  done: boolean
}

function OnboardingChecklist({
  orgId,
  orgName,
  steps,
}: {
  orgId: string
  orgName: string
  steps: OnboardingStep[]
}) {
  const completedCount = steps.filter((s) => s.done).length
  const allDone = completedCount === steps.length

  return (
    <Card>
      <CardBody className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2">Get started with {orgName}</h2>
          <p className="text-[13px] text-ink-3">
            Complete these steps to start selling tickets.
          </p>
        </div>
        <Chip size="sm" variant={allDone ? "active" : "muted"}>
          {completedCount}/{steps.length} done
        </Chip>
      </CardBody>
      <CardDivider />
      <CardBody className="flex flex-col gap-0 p-0">
        {steps.map((step, i) => (
          <Link
            key={step.key}
            href={step.done ? "#" : step.href}
            className={[
              "group flex items-center gap-4 px-5 py-4 transition-colors",
              i > 0 ? "border-t border-line" : "",
              step.done ? "cursor-default opacity-60" : "hover:bg-bg",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                step.done
                  ? "bg-ink text-surface"
                  : "border border-line-2 bg-surface text-ink-3",
              ].join(" ")}
            >
              {step.done ? (
                <Icon name="check" size={14} />
              ) : (
                <span className="h-2 w-2 rounded-full bg-line-2" />
              )}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[14px] font-semibold text-ink">{step.label}</p>
              <p className="text-[12px] text-ink-3">{step.description}</p>
            </div>
            {!step.done && (
              <Icon
                name="arrowR"
                size={14}
                className="shrink-0 text-ink-3 transition group-hover:translate-x-0.5"
              />
            )}
          </Link>
        ))}
      </CardBody>
    </Card>
  )
}

function OrgProfileBadge({
  completeness,
}: {
  completeness: { pct: number; missing: string[] }
}) {
  if (completeness.pct === 100) return null
  return (
    <Card flat className="border border-line bg-surface-2">
      <CardBody className="flex items-center gap-3 px-4 py-3">
        <Icon name="bell" size={14} className="shrink-0 text-ink-3" />
        <p className="text-[12px] text-ink-3">
          <span className="font-semibold text-ink">Profile incomplete</span> — missing:{" "}
          {completeness.missing.join(", ")}
        </p>
        <Link
          href="#profile"
          className="ml-auto shrink-0 font-mono text-[11px] uppercase tracking-wider text-accent underline-offset-4 hover:underline"
        >
          Fix
        </Link>
      </CardBody>
    </Card>
  )
}

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name, slug, bio, logo, default_currency")
    .eq("id", orgId)
    .maybeSingle()
  if (orgError || !org) return redirect("/403")

  const orgName = (org as any).name

  let events: any[] = []
  let kpis: any[] = []
  let totalTicketsSold = 0
  let totalRevenueCents = 0
  let totalCheckedIn = 0
  let activeEvents = 0
  let lastOrderAt: string | null = null

  // Profile completeness check
  const missing: string[] = []
  if (!org.bio) missing.push("bio")
  if (!org.logo) missing.push("logo")
  const profileFields = 4 // name, slug, bio, logo
  const filledFields = profileFields - missing.length
  const profileCompleteness = {
    pct: Math.round((filledFields / profileFields) * 100),
    missing,
  }

  // Parallel fetches for onboarding state + KPIs
  const [eventsRes, payoutAccountsRes, staffRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, status, starts_at")
      .eq("org_id", orgId)
      .order("starts_at", { ascending: false }),
    supabase
      .from("payout_accounts")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    supabase
      .from("org_members")
      .select("user_id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ])

  events = (eventsRes.data ?? []) as any[]
  const hasPayoutAccount = (payoutAccountsRes.count ?? 0) > 0
  const staffCount = staffRes.count ?? 0

  kpis = await getOrgEventKPIs(orgId)

  // Aggregate live stats from event_live_stats for events this org owns
  if (events.length > 0) {
    const eventIds = events.map((e) => e.id)
    const { data: liveStats } = await supabase
      .from("event_live_stats")
      .select("tickets_sold, gross_sales_cents, checked_in_count, last_order_at")
      .in("event_id", eventIds)

    for (const stat of liveStats ?? []) {
      totalTicketsSold += stat.tickets_sold ?? 0
      totalRevenueCents += stat.gross_sales_cents ?? 0
      totalCheckedIn += stat.checked_in_count ?? 0
      if (stat.last_order_at && (!lastOrderAt || stat.last_order_at > lastOrderAt)) {
        lastOrderAt = stat.last_order_at
      }
    }
  }

  activeEvents = events.filter((e) => e.status === "published").length

  const upcomingEvents = events.filter((e) => e.status === "published").slice(0, 5)
  const attendancePct =
    totalTicketsSold > 0 ? `${((totalCheckedIn / totalTicketsSold) * 100).toFixed(0)}%` : "0%"

  const onboardingSteps: OnboardingStep[] = [
    {
      key: "profile",
      label: "Complete your org profile",
      description: "Add your logo, bio and contact info so attendees know who you are.",
      href: `/orgs/${orgId}/team`,
      done: profileCompleteness.missing.length === 0,
    },
    {
      key: "event",
      label: "Create your first event",
      description: "Set up dates, venue and ticket types for your first event.",
      href: `/orgs/${orgId}/events/new`,
      done: events.length > 0,
    },
    {
      key: "payout",
      label: "Add a payout account",
      description: "Connect your bank so you can receive ticket sales proceeds.",
      href: `/orgs/${orgId}/payouts/accounts`,
      done: hasPayoutAccount,
    },
    {
      key: "staff",
      label: "Invite team members",
      description: "Add staff and scanners to help run your events.",
      href: `/orgs/${orgId}/team`,
      done: staffCount > 1,
    },
  ]

  const showOnboarding = events.length === 0 || onboardingSteps.some((s) => !s.done)

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">{orgName}</h1>
            <p className="text-[13px] text-ink-3">
              {events.length > 0
                ? "Welcome back. Here's your event overview."
                : "Let's get your first event live."}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link
              href={`/orgs/${orgId}/finance`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="wallet" size={14} />
              Finance
            </Link>
            <Link
              href={`/orgs/${orgId}/payouts`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              Payouts
            </Link>
            <Link
              href={`/orgs/${orgId}/events/new`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
            >
              <Icon name="plus" size={14} />
              New event
            </Link>
          </div>
        </div>

        <OrgProfileBadge completeness={profileCompleteness} />

        {showOnboarding && (
          <OnboardingChecklist orgId={orgId} orgName={orgName} steps={onboardingSteps} />
        )}

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
              value={totalTicketsSold.toLocaleString()}
              change={`${totalCheckedIn} checked in`}
              icon="ticket"
            />
            <MetricCard
              label="Gross sales"
              value={`SZL ${(totalRevenueCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
              change={`${attendancePct} attendance`}
              icon="wallet"
            />
            <MetricCard
              label="Last order"
              value={
                lastOrderAt
                  ? new Date(lastOrderAt).toLocaleDateString("en-SZ", { month: "short", day: "numeric" })
                  : "—"
              }
              change={lastOrderAt ? new Date(lastOrderAt).toLocaleTimeString("en-SZ", { hour: "2-digit", minute: "2-digit" }) : undefined}
              icon="check"
            />
          </div>
        )}

        {events.length > 0 && kpis.length > 0 && <DashboardCharts kpis={kpis} />}

        {events.length > 0 && (
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
                              {eventKpi?.total_tickets_sold ?? 0}
                            </p>
                          </div>
                          <div className="hidden flex-col items-end gap-0.5 sm:flex">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Revenue</p>
                            <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                              SZL {((eventKpi?.total_revenue_cents ?? 0) / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Check-in</p>
                            <p className="font-mono text-[14px] font-semibold tabular-nums text-ink">
                              {eventKpi?.total_checked_in ?? 0}
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
