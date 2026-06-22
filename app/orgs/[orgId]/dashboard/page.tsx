import Link from "next/link"
import { redirect } from "next/navigation"

import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { OnboardingChecklist } from "@/components/quiet/screens/organizer/onboarding-checklist"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getOrgEventKPIs } from "@/lib/adapters/kpis"
import DashboardCharts from "./dashboard-charts"

export const dynamic = "force-dynamic"

export default async function OrgDashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return redirect("/login")
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("name, bio, logo")
    .eq("id", orgId)
    .maybeSingle()

  if (orgError || !org) {
    return redirect("/403")
  }

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

  const events = (eventsRes.data ?? []) as any[]
  const kpis = await getOrgEventKPIs(orgId)
  const publishedEvents = events.filter((event) => event.status === "published")
  const recentEvents = publishedEvents.slice(0, 5)

  // Fetch real finance summary from fn_org_finance_summary RPC
  let financeSummaryGrossCents: number | null = null
  try {
    const { data: financeData, error: financeError } = await supabase.rpc(
      "fn_org_finance_summary",
      { p_org_id: orgId },
    )
    if (!financeError && financeData && typeof financeData === "object") {
      const d = financeData as Record<string, unknown>
      if (typeof d.gross_cents === "number") {
        financeSummaryGrossCents = d.gross_cents
      }
    }
  } catch {
    // non-fatal — show placeholder
  }

  // Aggregate tickets sold from event_live_stats
  let totalTicketsSold = 0
  let totalCheckedIn = 0
  let lastOrderAt: string | null = null

  if (events.length > 0) {
    const { data: liveStats } = await supabase
      .from("event_live_stats")
      .select("tickets_sold, gross_sales_cents, checked_in_count, last_order_at")
      .in(
        "event_id",
        events.map((event) => event.id),
      )

    for (const stat of liveStats ?? []) {
      totalTicketsSold += stat.tickets_sold ?? 0
      totalCheckedIn += stat.checked_in_count ?? 0
      if (stat.last_order_at && (!lastOrderAt || stat.last_order_at > lastOrderAt)) {
        lastOrderAt = stat.last_order_at
      }
    }
  }

  // Derived stats
  const grossCents = financeSummaryGrossCents ?? null
  const avgTicketCents =
    grossCents !== null && totalTicketsSold > 0
      ? Math.round(grossCents / totalTicketsSold)
      : null

  const missingProfileFields = [!org.bio ? "bio" : null, !org.logo ? "logo" : null].filter(Boolean)
  const hasPayoutAccount = (payoutAccountsRes.count ?? 0) > 0
  const staffCount = staffRes.count ?? 0
  const needsOnboarding = events.length === 0 || missingProfileFields.length > 0 || !hasPayoutAccount || staffCount <= 1

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-h1">{org.name}</h1>
            <p className="text-[13px] text-ink-3">
              {events.length > 0 ? "Welcome back. Here's your event overview." : "Let's get your first event live."}
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Link href={`/orgs/${orgId}/finance`} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 px-4 py-2.5 text-sm font-semibold text-ink hover:bg-bg">
              <Icon name="wallet" size={14} />
              Finance
            </Link>
            <Link href={`/orgs/${orgId}/events/new`} className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface hover:bg-ink-2">
              <Icon name="plus" size={14} />
              New event
            </Link>
          </div>
        </div>

        {/* Real stats row — always shown (uses fn_org_finance_summary) */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card flat>
            <CardBody className="flex flex-col gap-1 p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Revenue</span>
              <span className="font-mono text-[22px] font-semibold tabular-nums text-ink">
                {grossCents !== null
                  ? `SZL ${(grossCents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </CardBody>
          </Card>
          <Card flat>
            <CardBody className="flex flex-col gap-1 p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Tickets Sold</span>
              <span className="font-mono text-[22px] font-semibold tabular-nums text-ink">
                {totalTicketsSold.toLocaleString()}
              </span>
            </CardBody>
          </Card>
          <Card flat>
            <CardBody className="flex flex-col gap-1 p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Events</span>
              <span className="font-mono text-[22px] font-semibold tabular-nums text-ink">
                {events.length.toLocaleString()}
              </span>
            </CardBody>
          </Card>
          <Card flat>
            <CardBody className="flex flex-col gap-1 p-4">
              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Avg. Ticket</span>
              <span className="font-mono text-[22px] font-semibold tabular-nums text-ink">
                {avgTicketCents !== null
                  ? `SZL ${(avgTicketCents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}`
                  : "—"}
              </span>
            </CardBody>
          </Card>
        </div>

        {needsOnboarding && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h2">Get started with {org.name}</h2>
              <Chip size="sm" variant="muted">Setup</Chip>
            </div>
            <OnboardingChecklist
              orgId={orgId}
              steps={[
                {
                  id: "profile",
                  title: "Complete your profile",
                  description: "Add a bio and logo so buyers recognise your brand.",
                  href: `/orgs/${orgId}/team`,
                  done: missingProfileFields.length === 0,
                },
                {
                  id: "payout",
                  title: "Add a payout account",
                  description: "Connect a bank account to receive your revenue.",
                  href: `/orgs/${orgId}/payouts/accounts`,
                  done: hasPayoutAccount,
                },
                {
                  id: "event",
                  title: "Create your first event",
                  description: "Set up your event, ticket types, and go live.",
                  href: `/orgs/${orgId}/events/new`,
                  done: events.length > 0,
                },
                {
                  id: "scanner",
                  title: "Set up scanner devices",
                  description: "Register devices so your gate staff can check in attendees.",
                  href: `/orgs/${orgId}/events`,
                  done: false,
                },
                {
                  id: "team",
                  title: "Invite your team",
                  description: "Add staff, scanners and admins to your organisation.",
                  href: `/orgs/${orgId}/team`,
                  done: staffCount > 1,
                },
              ]}
            />
          </div>
        )}

        {events.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Active events" value={publishedEvents.length.toString()} icon="cal" />
            <Metric label="Tickets sold" value={totalTicketsSold.toLocaleString()} icon="ticket" />
            <Metric
              label="Gross sales"
              value={
                grossCents !== null
                  ? `SZL ${(grossCents / 100).toLocaleString("en-SZ", { minimumFractionDigits: 2 })}`
                  : "—"
              }
              icon="wallet"
            />
            <Metric label="Checked in" value={totalCheckedIn.toLocaleString()} icon="check" />
          </div>
        )}

        {events.length > 0 && kpis.length > 0 && <DashboardCharts kpis={kpis} />}

        {events.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-h2">Recent events</h2>
            <div className="flex flex-col gap-3">
              {recentEvents.map((event) => (
                <Link key={event.id} href={`/orgs/${orgId}/events/${event.id}`} className="block">
                  <Card className="transition-colors hover:border-line-2">
                    <CardBody className="flex items-center justify-between gap-4 p-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <h3 className="truncate text-[14px] font-semibold text-ink">{event.title}</h3>
                        <p className="text-[12px] text-ink-3">{event.starts_at ? new Date(event.starts_at).toLocaleDateString() : "Date pending"}</p>
                      </div>
                      <Chip size="sm" variant={event.status === "published" ? "active" : "muted"} className="capitalize">
                        {event.status}
                      </Chip>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <Card flat className="border-dashed">
            <CardBody className="p-8 text-center text-[13px] text-ink-3">
              No events yet. Create your first event to start selling tickets.
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  )
}

function Metric({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <Card className="transition-colors hover:border-line-2">
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
