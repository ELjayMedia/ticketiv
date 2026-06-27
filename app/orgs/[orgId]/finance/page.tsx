import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { requireOrgCapability } from "@/lib/data/organizer/access"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"
import { EmptyState } from "@/components/quiet/ui/empty-state"
import { FinanceDateFilter } from "./finance-date-filter"

export const dynamic = "force-dynamic"
export const metadata = { title: "Finance Summary" }

function fmt(cents: number) {
  return `SZL ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtPct(value: number) {
  return `${value.toFixed(1)}%`
}

function KpiTile({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: {
  label: string
  value: string
  detail?: string
  icon: IconName
  tone?: "neutral" | "positive" | "warning" | "danger"
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-2 p-5">
        <div className="flex items-center justify-between">
          <span className="text-label">{label}</span>
          <Icon
            name={icon}
            size={15}
            className={
              tone === "positive"
                ? "text-success"
                : tone === "warning"
                  ? "text-warning"
                  : tone === "danger"
                    ? "text-danger"
                    : "text-ink-3"
            }
          />
        </div>
        <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
        {detail && (
          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{detail}</p>
        )}
      </CardBody>
    </Card>
  )
}

interface FinanceSummary {
  gross_cents: number
  fees_cents: number
  net_cents: number
  refunds_cents: number
  paid_out_cents: number
  pending_payout_cents: number
  available_cents: number
}

interface EventMetric {
  id: string
  title: string
  status: string
  starts_at: string | null
  tickets_sold: number
  gross_sales_cents: number
  checked_in_count: number
}

interface TicketTypeMetric {
  ticket_type_id: string
  name: string
  eventTitle: string
  price_cents: number
  tickets_sold: number
  revenue_cents: number
}

export default async function OrgFinancePage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { orgId } = await params
  await requireOrgCapability(orgId, "payouts")
  const { from: rawFrom, to: rawTo } = await searchParams

  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const { data: org } = await supabase
    .from("organizations")
    .select("name, default_currency")
    .eq("id", orgId)
    .maybeSingle()
  if (!org) return redirect("/403")

  // TICK-231: Pass date range to RPC if provided
  const dateFrom = rawFrom ?? null
  const dateTo = rawTo ?? null

  const rpcArgs: Record<string, unknown> = { p_org_id: orgId }
  if (dateFrom) rpcArgs.p_from = dateFrom
  if (dateTo) rpcArgs.p_to = dateTo

  const { data: summaryRaw } = await (supabase.rpc as any)("fn_org_finance_summary", rpcArgs)
  const s = (summaryRaw ?? {}) as Record<string, number>
  const summary: FinanceSummary = {
    gross_cents: s.gross_cents ?? 0,
    fees_cents: s.fees_cents ?? 0,
    net_cents: s.net_cents ?? 0,
    refunds_cents: s.refunds_cents ?? 0,
    paid_out_cents: s.paid_out_cents ?? 0,
    pending_payout_cents: s.pending_payout_cents ?? 0,
    available_cents: s.available_cents ?? 0,
  }

  // TICK-234: Derived percentage KPIs
  const refundRate =
    summary.gross_cents > 0
      ? Math.abs(summary.refunds_cents) / summary.gross_cents * 100
      : 0
  const netMargin =
    summary.gross_cents > 0
      ? summary.net_cents / summary.gross_cents * 100
      : 0

  // Per-event breakdown via event_live_stats
  const { data: events } = await supabase
    .from("events")
    .select("id, title, status, starts_at")
    .eq("org_id", orgId)
    .order("starts_at", { ascending: false })

  let perEvent: EventMetric[] = []
  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id)
    const { data: stats } = await supabase
      .from("event_live_stats")
      .select("event_id, tickets_sold, gross_sales_cents, checked_in_count")
      .in("event_id", eventIds)

    const statsMap = new Map((stats ?? []).map((s) => [s.event_id, s]))
    perEvent = events.map((event) => {
      const stat = statsMap.get(event.id)
      return {
        id: event.id,
        title: event.title,
        status: event.status,
        starts_at: event.starts_at,
        tickets_sold: stat?.tickets_sold ?? 0,
        gross_sales_cents: stat?.gross_sales_cents ?? 0,
        checked_in_count: stat?.checked_in_count ?? 0,
      }
    })
  }

  // TICK-232: Per-ticket-type revenue breakdown
  let perTicketType: TicketTypeMetric[] = []
  if (events && events.length > 0) {
    const eventIds = events.map((e) => e.id)
    const { data: ticketTypes } = await supabase
      .from("ticket_types")
      .select("id, name, price_cents, quota, event_id")
      .in("event_id", eventIds)

    if (ticketTypes && ticketTypes.length > 0) {
      const ttIds = ticketTypes.map((tt) => tt.id)
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("ticket_type_id")
        .in("ticket_type_id", ttIds)
        .in("status", ["issued", "checked_in"])
        .limit(10000)

      const countMap = new Map<string, number>()
      for (const row of itemRows ?? []) {
        countMap.set(row.ticket_type_id, (countMap.get(row.ticket_type_id) ?? 0) + 1)
      }

      const eventTitleMap = new Map(events.map((e) => [e.id, e.title]))
      perTicketType = ticketTypes
        .map((tt) => ({
          ticket_type_id: tt.id,
          name: tt.name,
          eventTitle: eventTitleMap.get(tt.event_id) ?? "",
          price_cents: tt.price_cents ?? 0,
          tickets_sold: countMap.get(tt.id) ?? 0,
          revenue_cents: (countMap.get(tt.id) ?? 0) * (tt.price_cents ?? 0),
        }))
        .filter((tt) => tt.tickets_sold > 0)
        .sort((a, b) => b.revenue_cents - a.revenue_cents)
    }
  }

  const hasData = summary.gross_cents > 0

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto flex flex-col gap-8 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/orgs/${orgId}/dashboard`}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink"
              >
                <Icon name="chevL" size={16} />
              </Link>
              <h1 className="text-h1">Finance summary</h1>
            </div>
            <p className="pl-10 text-[13px] text-ink-3">
              All figures sourced from the ledger via fn_org_finance_summary.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/api/orgs/${orgId}/finance/export${dateFrom || dateTo ? `?from=${dateFrom ?? ""}&to=${dateTo ?? ""}` : ""}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="download" size={14} />
              Export CSV
            </Link>
            <Link
              href={`/orgs/${orgId}/payouts`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              <Icon name="wallet" size={14} />
              Payouts
            </Link>
          </div>
        </div>

        {/* TICK-231: Date range filter */}
        <FinanceDateFilter currentFrom={dateFrom} currentTo={dateTo} />

        {!hasData ? (
          <EmptyState
            icon="wallet"
            title="No paid orders yet"
            description="Finance figures will appear here once your first ticket sale completes."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiTile label="Gross sales" value={fmt(summary.gross_cents)} icon="wallet" tone="positive" />
              <KpiTile
                label="Platform + processor fees"
                value={fmt(summary.fees_cents)}
                icon="trending"
                tone="warning"
              />
              <KpiTile
                label="Refunds"
                value={fmt(Math.abs(summary.refunds_cents))}
                icon="chevL"
                tone="warning"
              />
              <KpiTile label="Net earned" value={fmt(summary.net_cents)} icon="check" tone="positive" />
            </div>

            {/* TICK-234: Refund rate % and net margin % KPI tiles */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <KpiTile
                label="Available balance"
                value={fmt(summary.available_cents)}
                detail="Ready to request payout"
                icon="wallet"
                tone="positive"
              />
              <KpiTile
                label="Pending payout"
                value={fmt(summary.pending_payout_cents)}
                detail="In-flight to bank"
                icon="trending"
              />
              <KpiTile
                label="Refund rate"
                value={fmtPct(refundRate)}
                detail={refundRate > 5 ? "Above 5% — investigate" : "Healthy"}
                icon="trending"
                tone={refundRate > 5 ? "danger" : "positive"}
              />
              <KpiTile
                label="Net margin"
                value={fmtPct(netMargin)}
                detail="After fees and refunds"
                icon="trending"
                tone={netMargin > 80 ? "positive" : netMargin > 60 ? "neutral" : "warning"}
              />
            </div>
          </>
        )}

        {perTicketType.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-h2">Per-ticket-type breakdown</h2>
            <Card>
              <CardBody className="px-5 py-4">
                <p className="text-label">Ticket types ({perTicketType.length})</p>
              </CardBody>
              <CardDivider />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Ticket type</th>
                      <th className="px-5 py-3 text-left text-label">Event</th>
                      <th className="px-5 py-3 text-right text-label">Unit price</th>
                      <th className="px-5 py-3 text-right text-label">Qty sold</th>
                      <th className="px-5 py-3 text-right text-label">Revenue (SZL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perTicketType.map((tt, i) => (
                      <tr
                        key={tt.ticket_type_id}
                        className={[
                          i > 0 ? "border-t border-line" : "",
                          "transition-colors hover:bg-bg",
                        ].join(" ")}
                      >
                        <td className="px-5 py-3 text-[13px] font-semibold text-ink">{tt.name}</td>
                        <td className="px-5 py-3 text-[13px] text-ink-2">{tt.eventTitle}</td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] tabular-nums text-ink-2">
                          {(tt.price_cents / 100).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] tabular-nums text-ink">
                          {tt.tickets_sold.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {(tt.revenue_cents / 100).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-bg">
                      <td colSpan={3} className="px-5 py-3 text-label">
                        Total
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                        {perTicketType.reduce((s, t) => s + t.tickets_sold, 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                        {(
                          perTicketType.reduce((s, t) => s + t.revenue_cents, 0) / 100
                        ).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </section>
        )}

        {perEvent.length > 0 && (
          <section className="flex flex-col gap-4">
            <h2 className="text-h2">Per-event breakdown</h2>
            <Card>
              <CardBody className="px-5 py-4">
                <p className="text-label">Events ({perEvent.length})</p>
              </CardBody>
              <CardDivider />
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-5 py-3 text-left text-label">Event</th>
                      <th className="px-5 py-3 text-left text-label">Status</th>
                      <th className="px-5 py-3 text-right text-label">Tickets sold</th>
                      <th className="px-5 py-3 text-right text-label">Gross (SZL)</th>
                      <th className="px-5 py-3 text-right text-label">Checked in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perEvent.map((event, i) => (
                      <tr
                        key={event.id}
                        className={[
                          i > 0 ? "border-t border-line" : "",
                          "transition-colors hover:bg-bg",
                        ].join(" ")}
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/orgs/${orgId}/events/${event.id}`}
                            className="flex flex-col gap-0.5 hover:underline"
                          >
                            <span className="text-[13px] font-semibold text-ink">{event.title}</span>
                            {event.starts_at && (
                              <span className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                                {new Date(event.starts_at).toLocaleDateString("en-SZ")}
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <Chip
                            size="sm"
                            variant={
                              event.status === "published"
                                ? "active"
                                : event.status === "archived"
                                  ? "default"
                                  : "muted"
                            }
                            className="capitalize"
                          >
                            {event.status}
                          </Chip>
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] tabular-nums text-ink">
                          {event.tickets_sold.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                          {(event.gross_sales_cents / 100).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-mono text-[13px] tabular-nums text-ink">
                          {event.checked_in_count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-line bg-bg">
                      <td colSpan={2} className="px-5 py-3 text-label">
                        Total
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                        {perEvent.reduce((s, e) => s + e.tickets_sold, 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                        {(perEvent.reduce((s, e) => s + e.gross_sales_cents, 0) / 100).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-3 text-right font-mono text-[13px] font-semibold tabular-nums text-ink">
                        {perEvent.reduce((s, e) => s + e.checked_in_count, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          </section>
        )}
      </div>
    </main>
  )
}
