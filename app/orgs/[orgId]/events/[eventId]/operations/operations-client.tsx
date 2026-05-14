"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Banknote, CheckCircle2, ClipboardList, QrCode, RefreshCw, Ticket, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/pricing"

type OpsPayload = {
  event: any
  tickets: any[]
  orders: any[]
  metrics: Record<string, number>
  readiness: Array<{ key: string; label: string; complete: boolean }>
}

function statusVariant(status: string) {
  if (status === "paid" || status === "on_sale") return "default"
  if (status === "pending" || status === "paused") return "secondary"
  return "outline"
}

export function EventOperationsClient({ orgId, eventId }: { orgId: string; eventId: string }) {
  const [data, setData] = useState<OpsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadOps()
  }, [eventId])

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

  if (loading) return <main className="min-h-screen p-6 text-sm text-muted-foreground">Loading operations...</main>
  if (error || !data) return <main className="min-h-screen p-6 text-sm text-red-600">{error || "Operations unavailable"}</main>

  const { event, metrics } = data
  const currency = data.tickets[0]?.currency || data.orders[0]?.currency || "SZL"

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <Button asChild variant="ghost" size="icon">
              <Link href={`/orgs/${orgId}/events/${eventId}/edit`}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">Event operations</p>
              <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge>{event.status}</Badge>
                <Badge variant="outline">{event.visibility}</Badge>
                <Badge variant="secondary">Readiness {readinessPercent}%</Badge>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline"><Link href={`/orgs/${orgId}/events/${eventId}/edit`}>Edit event</Link></Button>
            <Button asChild><Link href={`/orgs/${orgId}/events/${eventId}/scanner`}><QrCode className="mr-2 h-4 w-4" /> Scanner</Link></Button>
            <Button onClick={loadOps} variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
          </div>
        </div>

        <section className="grid gap-3 md:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Revenue</p><p className="text-2xl font-bold">{formatCurrency(metrics.gross_revenue_cents || 0, currency)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Orders</p><p className="text-2xl font-bold">{metrics.total_orders || 0}</p><p className="text-xs text-muted-foreground">{metrics.pending_orders || 0} pending</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Issued tickets</p><p className="text-2xl font-bold">{metrics.issued_tickets || 0}</p><p className="text-xs text-muted-foreground">{metrics.checked_in_tickets || 0} checked in</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Guestlist / Staff</p><p className="text-2xl font-bold">{metrics.guestlist_count || 0} / {metrics.staff_count || 0}</p><p className="text-xs text-muted-foreground">{metrics.scans_count || 0} scans</p></CardContent></Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Readiness checklist</CardTitle></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {data.readiness.map((item) => (
                <div key={item.key} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{item.label}</span>
                  {item.complete ? <Badge><CheckCircle2 className="mr-1 h-3 w-3" /> Done</Badge> : <Badge variant="outline">Open</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-5 w-5" /> Finance snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Paid orders</span><span className="font-medium">{metrics.paid_orders || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pending orders</span><span className="font-medium">{metrics.pending_orders || 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Gross revenue</span><span className="font-medium">{formatCurrency(metrics.gross_revenue_cents || 0, currency)}</span></div>
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Payout accounts and formal payout workflows will plug in here. For MVP this shows event-level revenue readiness.</p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Tickets</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.tickets.length === 0 ? <p className="text-sm text-muted-foreground">No ticket types yet.</p> : data.tickets.map((ticket) => {
                const online = ticket.ticket_type_channels?.find?.((channel: any) => channel.channel === "online")
                return (
                  <div key={ticket.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{ticket.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(ticket.price_cents || 0, ticket.currency || currency)} • {ticket.quota} total • online {online?.quota ?? "—"}</p>
                      </div>
                      <Badge variant={statusVariant(ticket.sales_status) as any}>{ticket.sales_status}</Badge>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Recent orders</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {data.orders.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : data.orders.map((order) => (
                <div key={order.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">{order.buyer_email || order.email || "No email"} • {order.item_count || "—"} item(s)</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={statusVariant(order.status) as any}>{order.status}</Badge>
                      <p className="mt-1 text-xs font-medium">{formatCurrency(order.total_cents || 0, order.currency || currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}
