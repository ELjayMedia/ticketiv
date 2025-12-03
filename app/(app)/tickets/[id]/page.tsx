import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return <div className="p-4 text-center">Supabase not configured</div>
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: ticket } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      event_id,
      ticket_type_id,
      quantity,
      unit_price,
      total_amount,
      created_at,
      ticket_type:ticket_types(name, price, description),
      event:events(title, description, starts_at, ends_at, venue_id),
      order:orders(purchaser_email, purchaser_first_name)
    `)
    .eq("id", params.id)
    .single()

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
              <CardTitle>Ticket QR Code</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center bg-muted p-8 rounded-lg">
                <div className="text-muted-foreground text-center">QR Code Preview</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{ticket.event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium">{new Date(ticket.event.starts_at).toLocaleString()}</p>
              </div>
              {ticket.event.description && (
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
                <p className="font-medium">{ticket.ticket_type.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="font-semibold text-lg">${(ticket.unit_price / 100).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="font-medium">{ticket.quantity}</p>
              </div>
              <Button className="w-full">Transfer Ticket</Button>
              <Button variant="outline" className="w-full bg-transparent">
                Download PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
