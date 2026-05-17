import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, MapPin, QrCode, ShieldAlert, Ticket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type TicketDetail = {
  id: string
  ticket_code: string | null
  status: string
  holder_name: string | null
  holder_email: string | null
  holder_phone: string | null
  checked_in_at: string | null
  revoked_at: string | null
  refunded_at: string | null
  order: {
    id: string
    status: "pending" | "paid" | "failed" | "refunded"
    buyer_id: string
    buyer_email: string | null
    created_at: string
  } | null
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
      cover_image_url: string | null
      venue: {
        name: string | null
        city: string | null
        address: string | null
      } | null
    } | null
  } | null
}

type PageProps = {
  params: Promise<{ ticketId: string }>
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Date to be confirmed"
  return new Intl.DateTimeFormat("en-SZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function makeQrUrl(value: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(value)}`
}

function canUseForEntry(ticket: TicketDetail) {
  return ticket.order?.status === "paid" && ticket.status === "issued" && Boolean(ticket.ticket_code)
}

function statusLabel(ticket: TicketDetail) {
  if (ticket.order?.status === "pending") return "Payment pending"
  if (ticket.order?.status === "failed") return "Payment failed"
  if (ticket.order?.status === "refunded") return "Refunded"
  if (ticket.status === "issued") return "Ready for entry"
  if (ticket.status === "checked_in") return "Already checked in"
  if (ticket.status === "revoked") return "Revoked"
  if (ticket.status === "refunded") return "Refunded"
  if (ticket.status === "transferred") return "Transferred"
  return ticket.status.replaceAll("_", " ")
}

function statusVariant(ticket: TicketDetail): "default" | "secondary" | "destructive" | "outline" {
  if (ticket.order?.status === "failed" || ticket.status === "revoked") return "destructive"
  if (ticket.order?.status === "pending") return "outline"
  if (ticket.status === "issued") return "default"
  return "secondary"
}

function blockedReason(ticket: TicketDetail) {
  if (ticket.order?.status === "pending") return "This ticket is waiting for payment confirmation. The QR code will appear once payment is confirmed."
  if (ticket.order?.status === "failed") return "Payment failed, so this ticket cannot be used for entry."
  if (ticket.order?.status === "refunded" || ticket.status === "refunded") return "This ticket has been refunded and cannot be used for entry."
  if (ticket.status === "checked_in") return "This ticket has already been checked in and cannot be used again."
  if (ticket.status === "revoked") return "This ticket has been revoked and cannot be used for entry."
  if (ticket.status === "transferred") return "This ticket has been transferred and is no longer available in this wallet."
  return "This ticket is not currently active for entry."
}

export default async function TicketDetailPage({ params }: PageProps) {
  const { ticketId } = await params
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect(`/login?redirectTo=${encodeURIComponent(`/tickets/${ticketId}`)}`)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) redirect(`/login?redirectTo=${encodeURIComponent(`/tickets/${ticketId}`)}`)

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id,
      ticket_code,
      status,
      holder_name,
      holder_email,
      holder_phone,
      checked_in_at,
      revoked_at,
      refunded_at,
      order:orders!inner(id, status, buyer_id, buyer_email, created_at),
      ticket_type:ticket_types(
        id,
        name,
        price_cents,
        currency,
        event:events(
          id,
          title,
          slug,
          starts_at,
          ends_at,
          city,
          cover_image_url,
          venue:venues(name, city, address)
        )
      )
    `)
    .eq("id", ticketId)
    .eq("order.buyer_id", session.user.id)
    .maybeSingle()

  if (error) {
    console.error("Failed to load ticket detail", error)
    throw new Error("Unable to load ticket")
  }

  if (!data) notFound()

  const ticket = data as unknown as TicketDetail
  const event = ticket.ticket_type?.event
  const venue = event?.venue
  const showQr = canUseForEntry(ticket)

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="ghost" className="rounded-full px-0 hover:bg-transparent">
          <Link href="/my-tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to my tickets</Link>
        </Button>

        <header className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Ticket #{ticket.id.slice(0, 8)}</p>
              <h1 className="text-3xl font-bold tracking-tight">{event?.title ?? "Ticketiv event"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{ticket.ticket_type?.name ?? "Ticket"}</p>
            </div>
            <Badge variant={statusVariant(ticket)} className="w-fit capitalize">{statusLabel(ticket)}</Badge>
          </div>
        </header>

        <Card className={showQr ? "border-primary/30 bg-primary/5" : "border-dashed"}>
          <CardContent className="grid gap-5 p-5 sm:grid-cols-[1fr_260px] sm:items-center">
            <div className="space-y-3">
              {showQr ? (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <h2 className="font-semibold">Ready for entry</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Present this QR code at the gate. It can only be checked in once.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="font-semibold">QR code hidden</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{blockedReason(ticket)}</p>
                  </div>
                </div>
              )}

              {ticket.checked_in_at ? (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" /> Checked in {formatDate(ticket.checked_in_at)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col items-center gap-3 rounded-2xl bg-background p-4 shadow-sm">
              {showQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={makeQrUrl(ticket.ticket_code!)} alt="Ticket QR code" className="h-56 w-56 rounded bg-white p-2" />
              ) : (
                <div className="flex h-56 w-56 flex-col items-center justify-center rounded bg-muted text-center text-sm text-muted-foreground">
                  <QrCode className="mb-3 h-10 w-10" /> QR unavailable
                </div>
              )}
              {showQr && ticket.ticket_code ? <p className="max-w-[14rem] break-all text-center text-[11px] text-muted-foreground">{ticket.ticket_code}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5" /> Event details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Starts</p>
                <p className="font-medium">{formatDate(event?.starts_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ends</p>
                <p className="font-medium">{formatDate(event?.ends_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Venue</p>
                <p className="font-medium">{venue?.name ?? "Venue to be confirmed"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="inline-flex items-center gap-1 font-medium"><MapPin className="h-4 w-4" /> {venue?.city ?? event?.city ?? "Location to be confirmed"}</p>
              </div>
            </div>

            {venue?.address ? <p className="text-sm text-muted-foreground">{venue.address}</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><Ticket className="h-5 w-5" /> Ticket holder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="text-right font-medium">{ticket.holder_name ?? "Not set"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="text-right font-medium">{ticket.holder_email ?? ticket.order?.buyer_email ?? "Not set"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Phone</span>
              <span className="text-right font-medium">{ticket.holder_phone ?? "Not set"}</span>
            </div>
            <Separator />
            <div className="flex flex-col gap-2 sm:flex-row">
              {event ? (
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/events/${event.id}`}>View event</Link>
                </Button>
              ) : null}
              {ticket.order ? (
                <Button asChild variant="secondary" className="flex-1">
                  <Link href={`/orders/${ticket.order.id}`}>View order</Link>
                </Button>
              ) : null}
              <Button disabled variant="secondary" className="flex-1">Transfer soon</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
