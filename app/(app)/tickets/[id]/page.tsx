import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoTicketDetail } from "@/lib/demo-data"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { QrCode, Download, Send } from "lucide-react"
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
    const supabase = createServerSupabaseClient()

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

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/app/tickets">← Back to Tickets</Link>
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
              <div className="flex flex-col items-center gap-4 bg-muted p-8 rounded-lg">
                <div className="text-center space-y-2">
                  <QrCode className="h-48 w-48 text-muted-foreground mx-auto" />
                  <p className="font-mono text-sm">{ticket.ticket_code || "DEMO-TICKET-001"}</p>
                  <Badge variant={ticket.checked_in_at ? "secondary" : "default"}>
                    {ticket.checked_in_at ? "Used" : "Valid"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{ticket.event?.title || "Event"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium">
                  {ticket.event?.starts_at ? new Date(ticket.event.starts_at).toLocaleString() : "TBA"}
                </p>
              </div>
              {ticket.event?.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="text-sm">{ticket.event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
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
              <div className="pt-2 space-y-2">
                <Button className="w-full bg-transparent" variant="outline">
                  <Send className="h-4 w-4 mr-2" />
                  Transfer Ticket
                </Button>
                <Button variant="outline" className="w-full bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
