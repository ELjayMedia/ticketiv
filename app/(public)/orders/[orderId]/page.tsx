import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { CheckCircle2, Clock, Download, ExternalLink, QrCode, RefreshCw, Ticket } from "lucide-react"

import { PendingPaymentRefresh } from "@/components/orders/pending-payment-refresh"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/pricing"
import { createServerSupabaseClient } from "@/lib/supabase-server"

interface OrderPageProps {
  params: Promise<{ orderId: string }>
}

type OrderItem = {
  id: string
  ticket_code: string | null
  status: string
  checked_in_at: string | null
  holder_name: string | null
  holder_email: string | null
  ticket_type: {
    id: string
    name: string
    price_cents: number
    currency: string
    event: {
      id: string
      title: string
      slug: string | null
      starts_at: string | null
      ends_at: string | null
      city: string | null
    } | null
  } | null
}

type Order = {
  id: string
  buyer_id: string
  buyer_email: string | null
  email: string | null
  total_cents: number
  currency: string
  status: "pending" | "paid" | "failed" | "refunded"
  created_at: string
  order_items: OrderItem[]
}

function formatDate(value: string | null) {
  if (!value) return "Date to be confirmed"
  return new Intl.DateTimeFormat("en-SZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function statusBadge(status: Order["status"]) {
  if (status === "paid") return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Paid</Badge>
  if (status === "pending") return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Awaiting payment</Badge>
  return <Badge variant="destructive">{status}</Badge>
}

function ticketStatusBadge(status: string) {
  if (status === "issued") return <Badge className="gap-1"><Ticket className="h-3 w-3" /> Issued</Badge>
  if (status === "checked_in") return <Badge variant="secondary">Checked in</Badge>
  if (status === "pending") return <Badge variant="outline">Pending payment</Badge>
  return <Badge variant="secondary">{status}</Badge>
}

function makeQrUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(value)}`
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params
  const supabase = createServerSupabaseClient()

  if (!supabase) notFound()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/orders/${orderId}`)}`)
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id, buyer_id, buyer_email, email, total_cents, currency, status, created_at,
      order_items(
        id, ticket_code, status, checked_in_at, holder_name, holder_email,
        ticket_type:ticket_types(
          id, name, price_cents, currency,
          event:events(id, title, slug, starts_at, ends_at, city)
        )
      )
    `)
    .eq("id", orderId)
    .maybeSingle<Order>()

  if (error) {
    console.error("Failed to load order return page", error)
    throw new Error("Unable to load order")
  }

  if (!data) notFound()

  if (data.buyer_id !== session.user.id) {
    notFound()
  }

  const firstItem = data.order_items?.[0]
  const event = firstItem?.ticket_type?.event ?? null
  const hasIssuedTickets = data.order_items.some((item) => item.status === "issued" || item.status === "checked_in")

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Order #{data.id.slice(0, 8)}</p>
            <h1 className="text-2xl font-bold tracking-tight">{event?.title ?? "Your Ticketiv order"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDate(event?.starts_at ?? null)}</p>
          </div>
          {statusBadge(data.status)}
        </div>

        {data.status === "pending" && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">Waiting for Paystack confirmation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  If you have just paid, this page will update once Paystack sends the payment confirmation webhook.
                </p>
                <PendingPaymentRefresh />
              </div>
              <Button asChild variant="outline">
                <Link href={`/orders/${data.id}`}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh now
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {data.status === "paid" && hasIssuedTickets && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="font-semibold">Payment confirmed. Your tickets are ready.</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Present the QR code at the gate. Each ticket can only be checked in once.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Ticket className="h-5 w-5" /> Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.order_items.map((item, index) => {
              const canShowQr = data.status === "paid" && item.ticket_code && (item.status === "issued" || item.status === "checked_in")
              const ticketName = item.ticket_type?.name ?? `Ticket ${index + 1}`

              return (
                <div key={item.id} className="rounded-xl border border-border/60 p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div>
                        <h3 className="font-semibold">{ticketName}</h3>
                        <p className="text-xs text-muted-foreground">Ticket #{index + 1}</p>
                      </div>
                      {ticketStatusBadge(item.status)}
                      {item.holder_email && (
                        <p className="text-sm text-muted-foreground">Holder: {item.holder_email}</p>
                      )}
                      {item.checked_in_at && (
                        <p className="text-xs text-muted-foreground">Checked in: {formatDate(item.checked_in_at)}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-3 rounded-lg bg-muted/40 p-3">
                      {canShowQr ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={makeQrUrl(item.ticket_code!)}
                          alt={`QR code for ${ticketName}`}
                          className="h-40 w-40 rounded bg-white p-2"
                        />
                      ) : (
                        <div className="flex h-40 w-40 flex-col items-center justify-center rounded bg-background text-center text-sm text-muted-foreground">
                          <QrCode className="mb-2 h-8 w-8" />
                          QR available after payment
                        </div>
                      )}
                      {item.ticket_code && (
                        <p className="max-w-[10rem] break-all text-center text-[11px] text-muted-foreground">{item.ticket_code}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold">{formatCurrency(data.total_cents, data.currency)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{data.buyer_email ?? data.email ?? session.user.email}</span>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 sm:flex-row">
              {event && (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/events/${event.slug ?? event.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4" /> View event
                  </Link>
                </Button>
              )}
              <Button asChild variant="secondary" className="flex-1">
                <Link href="/my-tickets">
                  <Ticket className="mr-2 h-4 w-4" /> My tickets
                </Link>
              </Button>
              <Button disabled variant="secondary" className="flex-1">
                <Download className="mr-2 h-4 w-4" /> PDF soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
