import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return <div className="p-4 text-center">Supabase not configured</div>
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: event } = await supabase
    .from("events")
    .select(`
      id,
      title,
      description,
      status,
      starts_at,
      ends_at,
      venue_id,
      organizer_id,
      venue:venues(name, address_line1, city),
      ticket_types:ticket_types(id, name, price, quantity_total, quantity_remaining)
    `)
    .eq("id", params.eventId)
    .single()

  if (!event) notFound()

  const { data: orders = [] } = await supabase.from("orders").select("*").eq("event_id", params.eventId)

  const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const totalTicketsSold = orders.length

  return (
    <div className="mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" asChild>
            <Link href="/org/events">← Back to Events</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">{event.title}</h1>
        </div>
        <Badge variant={event.status === "published" ? "default" : "secondary"}>{event.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Sold</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalTicketsSold}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${(totalRevenue / 100).toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="guestlist">Guestlist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Date & Time</p>
                <p className="font-medium">{new Date(event.starts_at).toLocaleString()}</p>
              </div>
              {event.venue && (
                <div>
                  <p className="text-sm text-muted-foreground">Venue</p>
                  <p className="font-medium">
                    {event.venue.name}, {event.venue.city}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {event.ticket_types?.map((type: any) => (
                  <div key={type.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{type.name}</p>
                      <p className="text-sm text-muted-foreground">${(type.price / 100).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">
                        Sold: {type.quantity_total - type.quantity_remaining} / {type.quantity_total}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Total orders: {orders.length}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guestlist">
          <Card>
            <CardHeader>
              <CardTitle>Guestlist</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Guestlist management coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
