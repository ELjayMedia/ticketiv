"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { Icon } from "@/components/quiet/ui/icon"
import { formatCurrency } from "@/lib/pricing"
import { EventStatusControls } from "./event-status-controls"

type OpsPayload = {
  event: any
  tickets: any[]
  orders: any[]
  metrics: Record<string, number>
  readiness: Array<{ key: string; label: string; complete: boolean }>
}

function statusVariant(status: string): "active" | "default" | "muted" {
  if (status === "paid" || status === "on_sale") return "active"
  if (status === "pending" || status === "paused") return "muted"
  return "default"
}

function MetricTile({
  label,
  value,
  sub,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
}) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-1 p-4">
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">{label}</p>
        <p className="font-mono text-[22px] font-semibold tabular-nums text-ink">{value}</p>
        {sub && <p className="text-[12px] text-ink-3">{sub}</p>}
      </CardBody>
    </Card>
  )
}

export function EventOperationsClient({
  orgId,
  eventId,
  canManageStatus,
}: {
  orgId: string
  eventId: string
  canManageStatus: boolean
}) {
  const [data, setData] = useState<OpsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => { loadOps() }, [eventId])

  async function loadOps() {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/events/${eventId}/ops`, { cache: "no-store" })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Failed to load operations")
      setData(payload)
    } catch (err: any) {
      setError(err?.message || "Failed to load operations")
    } finally {
      setLoading(false)
    }
  }

  const readinessPercent = useMemo(() => {
    if (!data?.readiness?.length) return 0
    return Math.round((data.readiness.filter((item) => item.complete).length / data.readiness.length) * 100)
  }, [data])

  if (loading) {
    return <main className="min-h-dvh p-6 text-[13px] text-ink-3">Loading operations…</main>
  }
  if (error || !data) {
    return <main className="min-h-dvh p-6 text-[13px] text-danger">{error || "Operations unavailable"}</main>
  }

  const { event, metrics } = data
  const currency = data.tickets[0]?.currency || data.orders[0]?.currency || "SZL"

  return (
    <main className="min-h-dvh px-4 py-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Link
              href={`/orgs/${orgId}/events/${eventId}/edit`}
              aria-label="Back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-bg"
            >
              <Icon name="chevL" size={18} />
            </Link>
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">Event operations</p>
              <h1 className="text-h1">{event.title}</h1>
              <div className="flex flex-wrap gap-2">
                <Chip
                  size="sm"
                  variant={
                    event.status === "published"
                      ? "active"
                      : event.status === "paused"
                        ? "muted"
                        : "default"
                  }
                >
                  {event.status}
                </Chip>
                <Chip size="sm" variant="default">{event.visibility}</Chip>
                <Chip size="sm" variant="muted">Readiness {readinessPercent}%</Chip>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManageStatus && (
              <EventStatusControls
                orgId={orgId}
                eventId={eventId}
                status={event.status}
                issuedTickets={metrics.issued_tickets || 0}
                onSuccess={loadOps}
              />
            )}
            <Link
              href={`/orgs/${orgId}/events/${eventId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-line-2 bg-transparent px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-bg"
            >
              Edit event
            </Link>
            <Link
              href={`/orgs/${orgId}/events/${eventId}/scanner`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-ink bg-ink px-4 py-2.5 text-sm font-semibold text-surface transition-colors hover:bg-ink-2"
            >
              <Icon name="qr" size={14} /> Scanner
            </Link>
            <Button onClick={loadOps} variant="outline" size="md">
              <Icon name="arrowR" size={14} /> Refresh
            </Button>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <MetricTile label="Revenue" value={formatCurrency(metrics.gross_revenue_cents || 0, currency)} />
          <MetricTile
            label="Orders"
            value={metrics.total_orders || 0}
            sub={`${metrics.pending_orders || 0} pending`}
          />
          <MetricTile
            label="Issued tickets"
            value={metrics.issued_tickets || 0}
            sub={`${metrics.checked_in_tickets || 0} checked in`}
          />
          <MetricTile
            label="Guestlist / Staff"
            value={`${metrics.guestlist_count || 0} / ${metrics.staff_count || 0}`}
            sub={`${metrics.scans_count || 0} scans`}
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardBody className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Icon name="fileText" size={18} className="text-ink-3" />
                <p className="text-h3">Readiness checklist</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {data.readiness.map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-[var(--radius-md)] border border-line p-3 text-[13px]"
                  >
                    <span className="text-ink">{item.label}</span>
                    {item.complete ? (
                      <Chip size="sm" variant="active">
                        <Icon name="check" size={12} /> Done
                      </Chip>
                    ) : (
                      <Chip size="sm" variant="default">Open</Chip>
                    )}
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon name="wallet" size={18} className="text-ink-3" />
                <p className="text-h3">Finance snapshot</p>
              </div>
              <div className="flex flex-col gap-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ink-3">Paid orders</span>
                  <span className="font-mono font-semibold tabular-nums text-ink">{metrics.paid_orders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Pending orders</span>
                  <span className="font-mono font-semibold tabular-nums text-ink">{metrics.pending_orders || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-3">Gross revenue</span>
                  <span className="font-mono font-semibold tabular-nums text-ink">
                    {formatCurrency(metrics.gross_revenue_cents || 0, currency)}
                  </span>
                </div>
              </div>
              <p className="rounded-[var(--radius-md)] bg-bg p-3 text-[12px] text-ink-3">
                Payout accounts and formal payout workflows will plug in here. For MVP this shows event-level revenue readiness.
              </p>
            </CardBody>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon name="ticket" size={18} className="text-ink-3" />
                <p className="text-h3">Tickets</p>
              </div>
              {data.tickets.length === 0 ? (
                <p className="text-[13px] text-ink-3">No ticket types yet.</p>
              ) : (
                data.tickets.map((ticket) => {
                  const online = ticket.ticket_type_channels?.find?.((channel: any) => channel.channel === "online")
                  return (
                    <div key={ticket.id} className="rounded-[var(--radius-md)] border border-line p-3 text-[13px]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="font-semibold text-ink">{ticket.name}</p>
                          <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                            {formatCurrency(ticket.price_cents || 0, ticket.currency || currency)} · {ticket.quota} total · online {online?.quota ?? "—"}
                          </p>
                        </div>
                        <Chip size="sm" variant={statusVariant(ticket.sales_status)}>
                          {ticket.sales_status}
                        </Chip>
                      </div>
                    </div>
                  )
                })
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Icon name="users" size={18} className="text-ink-3" />
                <p className="text-h3">Recent orders</p>
              </div>
              {data.orders.length === 0 ? (
                <p className="text-[13px] text-ink-3">No orders yet.</p>
              ) : (
                data.orders.map((order) => (
                  <div key={order.id} className="rounded-[var(--radius-md)] border border-line p-3 text-[13px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col gap-0.5">
                        <p className="font-semibold text-ink">Order #{order.id.slice(0, 8)}</p>
                        <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">
                          {order.buyer_email || order.email || "No email"} · {order.item_count || "—"} item(s)
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Chip size="sm" variant={statusVariant(order.status)}>{order.status}</Chip>
                        <p className="font-mono text-[12px] font-semibold tabular-nums text-ink">
                          {formatCurrency(order.total_cents || 0, order.currency || currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </section>
      </div>
    </main>
  )
}
