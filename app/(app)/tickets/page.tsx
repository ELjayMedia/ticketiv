import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoUserTickets } from "@/lib/demo-data"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cookies } from "next/headers"
import { Calendar, TicketIcon, QrCode } from "lucide-react"

export const dynamic = "force-dynamic"

interface Ticket {
  id: string
  event: { title: string; starts_at: string } | null
  ticket_type: { name: string; price: number } | null
  ticket_code: string
  checked_in_at: string | null
}

export default async function MyTicketsPage() {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")
  let tickets: Ticket[] = []

  if (demoSessionCookie) {
    try {
      const demoUser = JSON.parse(decodeURIComponent(demoSessionCookie.value))
      tickets = getDemoUserTickets(demoUser.id)
    } catch (error) {
      console.error("[v0] Failed to parse demo session:", error)
    }
  } else {
    const supabase = await createServerSupabaseClient()

    if (!supabase) {
      return <div className="p-4 text-center">Supabase not configured</div>
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) redirect("/login")

    const { data } = await supabase
      .from("order_items")
      .select(`
        id,
        ticket_code,
        checked_in_at,
        ticket_type:ticket_types(name, price_cents),
        event:events(title, starts_at)
      `)
      .eq("order:orders!inner(buyer_id)", session.user.id)
      .order("created_at", { ascending: false })

    tickets = data || []
  }

  return (
    <>
      <div className="lg:hidden px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Tickets</h1>
          <p className="text-sm text-muted-foreground">View and manage your event tickets</p>
        </div>

        {tickets.length === 0 ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <TicketIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">No tickets yet</p>
              <p className="text-sm text-muted-foreground">Start exploring events to get your first ticket</p>
            </div>
            <Button asChild>
              <Link href="/browse">Browse Events</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((ticket: Ticket) => (
              <Link key={ticket.id} href={`/app/tickets/${ticket.id}`}>
                <Card className="overflow-hidden hover:border-primary transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <TicketIcon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-1 line-clamp-2">{ticket.event?.title || "Event"}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Calendar className="h-3 w-3" />
                          {ticket.event?.starts_at
                            ? new Date(ticket.event.starts_at).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "TBA"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={ticket.checked_in_at ? "secondary" : "default"} className="text-xs">
                            {ticket.checked_in_at ? "Checked In" : "Valid"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{ticket.ticket_type?.name || "General"}</span>
                        </div>
                      </div>
                      <QrCode className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block">
        <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-3xl font-bold">My Tickets</h1>
            <p className="text-muted-foreground">View and manage your event tickets</p>
          </div>

          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                  <TicketIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                <p className="mb-2 text-xl font-semibold">No tickets yet</p>
                <p className="mb-6 text-muted-foreground">Start exploring events to get your first ticket</p>
                <Button asChild size="lg">
                  <Link href="/browse">Browse Events</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tickets.map((ticket: Ticket) => (
                <Card key={ticket.id} className="overflow-hidden hover:border-primary transition-colors group">
                  <CardHeader className="pb-3 bg-gradient-to-br from-primary/5 to-primary/10">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="line-clamp-2 text-lg">{ticket.event?.title || "Event"}</CardTitle>
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <TicketIcon className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Ticket Type</p>
                      <p className="font-medium">{ticket.ticket_type?.name || "General"}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground text-xs mb-1">Event Date</p>
                      <p className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {ticket.event?.starts_at
                          ? new Date(ticket.event.starts_at).toLocaleDateString(undefined, {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "TBA"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={ticket.checked_in_at ? "secondary" : "default"}>
                        {ticket.checked_in_at ? "Checked In" : "Valid"}
                      </Badge>
                    </div>
                    <Button variant="outline" className="w-full bg-transparent" asChild>
                      <Link href={`/app/tickets/${ticket.id}`}>
                        <QrCode className="h-4 w-4 mr-2" />
                        View QR Code
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
