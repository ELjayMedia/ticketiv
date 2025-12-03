import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Ticket {
  id: string
  event: { title: string; starts_at: string }
  ticket_type: { name: string }
  qr_code: string
  status: string
  checked_in_at: string | null
}

export default async function MyTicketsPage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return <div className="p-4 text-center">Supabase not configured</div>
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: tickets = [] } = await supabase
    .from("order_items")
    .select(`
      id,
      order_id,
      event_id,
      ticket_type_id,
      created_at,
      updated_at,
      ticket_type:ticket_types(name, price),
      event:events(title, starts_at)
    `)
    .eq("purchaser_id", session.user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold">My Tickets</h1>
        <p className="text-muted-foreground">View and manage your event tickets</p>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-lg text-muted-foreground">You haven't purchased any tickets yet</p>
            <Button asChild>
              <Link href="/browse">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket: Ticket) => (
            <Card key={ticket.id} className="overflow-hidden hover:border-primary transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="line-clamp-2 text-lg">{ticket.event.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">Ticket Type</p>
                  <p className="font-medium">{ticket.ticket_type.name}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{new Date(ticket.event.starts_at).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ticket.checked_in_at ? "secondary" : "default"}>
                    {ticket.checked_in_at ? "Checked In" : "Valid"}
                  </Badge>
                </div>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href={`/app/tickets/${ticket.id}`}>View Details</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
