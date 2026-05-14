"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Clock, Ticket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/pricing"

type OrderPayload = {
  id: string
  status: string
  total_cents: number
  currency: string
  buyer_email?: string | null
  email?: string | null
  order_items?: Array<{
    id: string
    ticket_code: string
    status: string
    holder_name?: string | null
    holder_email?: string | null
    ticket_types?: {
      name: string
      price_cents: number
      currency: string
      events?: { id: string; title: string; starts_at?: string | null; city?: string | null; venues?: { name?: string | null; city?: string | null; address?: string | null } | null } | null
    } | null
  }>
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBA"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date TBA"
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export function OrderDetailClient({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadOrder() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(`/api/orders/${orderId}`, { cache: "no-store" })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || "Failed to load order")
        setOrder(payload.order)
      } catch (err: any) {
        setError(err?.message || "Failed to load order")
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [orderId])

  const event = useMemo(() => order?.order_items?.[0]?.ticket_types?.events ?? null, [order])
  const issued = order?.status === "paid"

  if (loading) return <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Loading order...</div>
  if (error || !order) return <div className="mx-auto max-w-3xl p-6 text-sm text-red-600">{error || "Order not found"}</div>

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-background">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-4">
          <Link href={event?.id ? `/events/${event.id}` : "/browse"} className="inline-flex rounded-lg p-2 transition-colors hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold">Order confirmation</h1>
            <p className="text-xs text-muted-foreground">{event?.title || "Ticketiv order"}</p>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{issued ? "Payment confirmed" : "Payment pending"}</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {issued ? "Your tickets have been issued." : "Your tickets will be issued after payment confirmation."}
                </p>
              </div>
              <Badge variant={issued ? "default" : "secondary"} className="gap-1">
                {issued ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                {order.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Order ID</span>
              <span className="font-mono text-xs">{order.id}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrency(order.total_cents, order.currency)}</span>
            </div>
            {event && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Event</span>
                  <span className="text-right font-medium">{event.title}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Date</span>
                  <span className="text-right">{formatDate(event.starts_at)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Venue</span>
                  <span className="text-right">{event.venues?.name || event.city || "Venue TBA"}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-bold">Tickets</h2>
          {(order.order_items ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4" />
                    <p className="font-semibold">{item.ticket_types?.name || "Ticket"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Code: {issued ? item.ticket_code : "Available after payment"}</p>
                  {item.holder_email && <p className="text-xs text-muted-foreground">Holder: {item.holder_email}</p>}
                </div>
                <Badge variant={item.status === "issued" ? "default" : "secondary"}>{item.status}</Badge>
              </CardContent>
            </Card>
          ))}
        </section>

        <Button asChild className="w-full">
          <Link href="/browse">Browse more events</Link>
        </Button>
      </main>
    </div>
  )
}
