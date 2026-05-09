import Link from "next/link"
import { redirect } from "next/navigation"
import { CalendarDays, ChevronRight, Clock, MapPin, Ticket } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

type TicketWalletItem = {
  id: string
  ticket_code: string | null
  status: string
  checked_in_at: string | null
  order: {
    id: string
    status: "pending" | "paid" | "failed" | "refunded"
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
    } | null
  } | null
}

function formatDate(value: string | null) {
  if (!value) return "Date to be confirmed"
  return new Intl.DateTimeFormat("en-SZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function ticketStatusLabel(item: TicketWalletItem) {
  if (item.order?.status === "pending") return "Payment pending"
  if (item.order?.status === "failed") return "Payment failed"
  if (item.order?.status === "refunded") return "Refunded"
  if (item.status === "checked_in") return "Checked in"
  if (item.status === "issued") return "Ready"
  return item.status
}

function ticketStatusVariant(item: TicketWalletItem): "default" | "secondary" | "destructive" | "outline" {
  if (item.order?.status === "failed") return "destructive"
  if (item.order?.status === "pending") return "outline"
  if (item.status === "issued") return "default"
  return "secondary"
}

export default async function MyTicketsPage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    redirect("/sign-in?redirectTo=/my-tickets")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/sign-in?redirectTo=/my-tickets")
  }

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id, ticket_code, status, checked_in_at,
      order:orders!inner(id, status, created_at, buyer_id),
      ticket_type:ticket_types(
        id, name, price_cents, currency,
        event:events(id, title, slug, starts_at, ends_at, city, cover_image_url)
      )
    `)
    .eq("order.buyer_id", session.user.id)
    .order("created_at", { referencedTable: "orders", ascending: false })

  if (error) {
    console.error("Failed to load buyer ticket wallet", error)
    throw new Error("Unable to load tickets")
  }

  const tickets = (data ?? []) as unknown as TicketWalletItem[]
  const upcomingTickets = tickets.filter((item) => {
    const startsAt = item.ticket_type?.event?.starts_at
    if (!startsAt) return true
    return new Date(startsAt).getTime() >= Date.now()
  })
  const pastTickets = tickets.filter((item) => {
    const startsAt = item.ticket_type?.event?.starts_at
    if (!startsAt) return false
    return new Date(startsAt).getTime() < Date.now()
  })

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Ticket wallet</p>
            <h1 className="text-3xl font-bold tracking-tight">My tickets</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              View your purchased tickets, payment-pending tickets, and check-in status across Ticketiv events.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/events">Browse events</Link>
          </Button>
        </header>

        {tickets.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <Ticket className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">No tickets yet</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Once you buy tickets, they will appear here with their QR code status.
              </p>
              <Button asChild className="mt-6">
                <Link href="/events">Find an event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            <TicketSection title="Upcoming" tickets={upcomingTickets} emptyText="No upcoming tickets." />
            <TicketSection title="Past" tickets={pastTickets} emptyText="No past tickets yet." />
          </div>
        )}
      </div>
    </main>
  )
}

function TicketSection({ title, tickets, emptyText }: { title: string; tickets: TicketWalletItem[]; emptyText: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{title}</h2>
        <Badge variant="secondary">{tickets.length}</Badge>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">{emptyText}</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {tickets.map((item) => {
            const event = item.ticket_type?.event
            const orderId = item.order?.id
            const href = orderId ? `/orders/${orderId}` : "#"

            return (
              <Link key={item.id} href={href} className="block">
                <Card className="transition-colors hover:bg-muted/40">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="hidden h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:block">
                        {event?.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={event.cover_image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Ticket className="h-7 w-7 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <h3 className="line-clamp-1 font-semibold">{event?.title ?? "Ticketiv event"}</h3>
                            <p className="text-sm text-muted-foreground">{item.ticket_type?.name ?? "Ticket"}</p>
                          </div>
                          <Badge variant={ticketStatusVariant(item)} className="w-fit">
                            {ticketStatusLabel(item)}
                          </Badge>
                        </div>

                        <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <span className="inline-flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5" /> {formatDate(event?.starts_at ?? null)}
                          </span>
                          {event?.city && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {event.city}
                            </span>
                          )}
                          {item.checked_in_at && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" /> Checked in {formatDate(item.checked_in_at)}
                            </span>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
