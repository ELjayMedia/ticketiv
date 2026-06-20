import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import Link from "next/link"

import { Card, CardBody, CardDivider } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon, type IconName } from "@/components/quiet/ui/icon"

export const dynamic = "force-dynamic"
export const metadata = { title: "Finance Summary" }

// TICK-53 — Organizer finance summary

function fmt(cents: number) {
  return `SZL ${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  tone?: "neutral" | "positive" | "warning"
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

export default async function OrgFinancePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params

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

  // fn_org_finance_summary is the single source of truth for all money figures
  const { data: summaryRaw } = await supabase.rpc("fn_org_finance_summary", { p_org_id: orgId })
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
          <Link
            href={`/orgs/${orgId}/payouts`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
          >
            <Icon name="wallet" size={14} />
            Payouts
          </Link>
        </div>

        {!hasData ? (
          <Card flat className="border-dashed">
            <CardBody className="flex flex-col items-center gap-4 px-4 py-16 text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-ink-3">
                <Icon name="wallet" size={28} />
              </span>
              <div className="flex max-w-sm flex-col items-center gap-2">
                <h2 className="text-h1">No paid orders yet</h2>
                <p className="text-[13px] text-ink-3">
                  Finance figures will appear here once your first ticket sale completes.
                </p>
              </div>
            </CardBody>
          </Card>
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
                value={fmt(summary.refunds_cents)}
                icon="chevL"
                tone="warning"
              />
              <KpiTile label="Net earned" value={fmt(summary.net_cents)} icon="check" tone="positive" />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                label="Paid out"
                value={fmt(summary.paid_out_cents)}
                detail="Received to date"
                icon="check"
              />
            </div>
          </>
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
