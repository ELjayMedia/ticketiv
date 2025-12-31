import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoTicketDetail } from "@/lib/demo-data"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { QrCode, Download, Send, Calendar, MapPin, ArrowLeft, TicketIcon } from "lucide-react"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")
  let ticket: any = null

  if (demoSessionCookie) {
    try {
      ticket = getDemoTicketDetail(params.id)
    } catch (error) {
      console.error("[v0] Failed to load demo ticket:", error)
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
        *,
        ticket_type:ticket_types(*),
        event:events(*),
        order:orders(*)
      `)
      .eq("id", params.id)
      .single()

    ticket = data
  }

  if (!ticket) notFound()

  const eventDate = ticket.event?.starts_at
    ? new Date(ticket.event.starts_at).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "TBA"

  const eventTime = ticket.event?.starts_at
    ? new Date(ticket.event.starts_at).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : ""

  return (
    <>
      <div className="lg:hidden min-h-screen bg-gradient-to-b from-background to-muted/20">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
          <Link href="/app/tickets">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">My Ticket</h1>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* QR Code Card - Prominent */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-8">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-full max-w-[280px] aspect-square bg-white rounded-2xl p-6 flex items-center justify-center shadow-lg">
                    <QrCode className="w-full h-full text-foreground" strokeWidth={0.5} />
                  </div>
                  <div className="text-center space-y-2">
                    <Badge variant={ticket.checked_in_at ? "secondary" : "default"} className="text-sm px-4 py-1">
                      {ticket.checked_in_at ? "Checked In" : "Valid"}
                    </Badge>
                    <p className="font-mono text-xs text-muted-foreground">{ticket.ticket_code || "DEMO-TICKET-001"}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Event Info */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <h2 className="text-xl font-bold mb-2">{ticket.event?.title || "Event"}</h2>
                <Badge className="bg-primary">{ticket.ticket_type?.name || "General"}</Badge>
              </div>

              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{eventDate}</p>
                    {eventTime && <p className="text-xs text-muted-foreground">{eventTime}</p>}
                  </div>
                </div>

                {ticket.event?.venue && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{ticket.event.venue.name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.event.venue.address_line1}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <TicketIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">
                      ${((ticket.unit_price_cents || ticket.ticket_type?.price_cents || 0) / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Quantity: {ticket.quantity || 1}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-3">
            <Button variant="outline" className="w-full h-12 bg-transparent" disabled>
              <Send className="h-4 w-4 mr-2" />
              Transfer Ticket
            </Button>
            <Button variant="outline" className="w-full h-12 bg-transparent" disabled>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">Present this QR code at the event entrance for check-in</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
          <div>
            <Button variant="ghost" asChild>
              <Link href="/app/tickets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Tickets
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Ticket QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-primary/5 to-primary/10 p-12 rounded-lg">
                    <div className="w-80 h-80 bg-white rounded-2xl p-8 flex items-center justify-center shadow-xl">
                      <QrCode className="w-full h-full text-foreground" strokeWidth={0.5} />
                    </div>
                    <div className="text-center space-y-3">
                      <Badge variant={ticket.checked_in_at ? "secondary" : "default"} className="text-base px-6 py-2">
                        {ticket.checked_in_at ? "Checked In" : "Valid"}
                      </Badge>
                      <p className="font-mono text-sm text-muted-foreground">
                        {ticket.ticket_code || "DEMO-TICKET-001"}
                      </p>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Present this QR code at the event entrance for check-in
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{ticket.event?.title || "Event"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date & Time</p>
                      <p className="font-medium">{eventDate}</p>
                      {eventTime && <p className="text-sm text-muted-foreground">{eventTime}</p>}
                    </div>
                  </div>

                  {ticket.event?.venue && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Venue</p>
                        <p className="font-medium">{ticket.event.venue.name}</p>
                        {ticket.event.venue.address_line1 && (
                          <p className="text-sm text-muted-foreground">{ticket.event.venue.address_line1}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {ticket.event?.description && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-sm">{ticket.event.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4 sticky top-24 self-start">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Ticket Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ticket Type</p>
                    <p className="font-medium">{ticket.ticket_type?.name || "General"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="font-semibold text-lg">
                      ${((ticket.unit_price_cents || ticket.ticket_type?.price_cents || 0) / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">{ticket.quantity || 1}</p>
                  </div>
                  <div className="pt-2 space-y-2 border-t">
                    <Button className="w-full bg-transparent" variant="outline" disabled>
                      <Send className="h-4 w-4 mr-2" />
                      Transfer Ticket
                    </Button>
                    <Button variant="outline" className="w-full bg-transparent" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
