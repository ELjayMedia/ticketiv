import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoEventById, getDemoEventOrders } from "@/lib/demo-data"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { QrCode, Download, UserPlus, AlertCircle, Eye } from "lucide-react"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

export default async function EventDetailPage({ params }: { params: { eventId: string } }) {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")
  let event: any = null
  let orders: any[] = []
  let totalRevenue = 0
  let totalTicketsSold = 0
  let totalCheckIns = 0
  let waitlist: any[] = []

  if (demoSessionCookie) {
    try {
      event = getDemoEventById(params.eventId)
      orders = getDemoEventOrders(params.eventId)
      totalRevenue = orders.reduce((sum, order) => sum + order.total_amount_cents, 0)
      totalTicketsSold = orders.reduce((sum, order) => sum + (order.order_items?.length || 0), 0)
    } catch (error) {
      console.error("[v0] Failed to load demo event:", error)
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

    const { data: eventData } = await supabase
      .from("events")
      .select(`
        *,
        venue:venues(*),
        ticket_types(*),
        event_dates(starts_at, ends_at)
      `)
      .eq("id", params.eventId)
      .single()

    event = eventData

    if (event) {
      const { data: ordersData = [] } = await supabase
        .from("orders")
        .select(`
          *,
          order_items(*)
        `)
        .eq("event_id", params.eventId)

      orders = ordersData
      totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount_cents || 0), 0)
      totalTicketsSold = orders.reduce((sum, order) => sum + (order.order_items?.length || 0), 0)

      const { data: scans = [] } = await supabase
        .from("scans")
        .select("id")
        .eq("event_id", params.eventId)
        .eq("outcome", "valid")

      totalCheckIns = scans.length

      const { data: waitlistData = [] } = await supabase.from("waitlist").select("*").eq("event_id", params.eventId)

      waitlist = waitlistData
    }
  }

  if (!event) notFound()

  const primaryDate = event.event_dates?.[0] || { starts_at: event.starts_at, ends_at: event.ends_at }

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between mb-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/org/events">← Back</Link>
          </Button>
          <Badge variant={event.status === "published" ? "default" : "secondary"}>
            {event.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>

        {event.status === "draft" && (
          <Alert className="border-amber-500 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>This event is private until published.</AlertDescription>
          </Alert>
        )}

        {event.status === "published" && (
          <Button variant="outline" size="sm" className="w-full gap-2" asChild>
            <Link href={`/events/${event.id}`}>
              <Eye className="h-4 w-4" />
              View Public Page
            </Link>
          </Button>
        )}

        <h1 className="text-2xl font-bold">{event.title}</h1>

        <div className="grid grid-cols-3 gap-2">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{totalTicketsSold}</p>
            <p className="text-xs text-muted-foreground">Sold</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">${(totalRevenue / 100).toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Revenue</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{totalCheckIns}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">
              Tickets
            </TabsTrigger>
            <TabsTrigger value="orders" className="text-xs">
              Orders
            </TabsTrigger>
            <TabsTrigger value="scanner" className="text-xs">
              Scanner
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Event Details</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{new Date(primaryDate.starts_at).toLocaleString()}</p>
                </div>
                {event.venue && (
                  <div>
                    <p className="text-muted-foreground">Venue</p>
                    <p className="font-medium">
                      {event.venue.name}, {event.venue.city}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="tickets" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Ticket Types</h3>
              <Button size="sm">Add</Button>
            </div>
            {event.ticket_types?.map((type: any) => (
              <Card key={type.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium">{type.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ${((type.price_cents || type.price) / 100).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="outline">
                    {(type.quantity_total || 0) - (type.quantity_remaining || 0)} / {type.quantity_total || 0}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="orders" className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Orders</h3>
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            {orders.length === 0 ? (
              <Card className="p-8">
                <p className="text-center text-sm text-muted-foreground">No orders yet</p>
              </Card>
            ) : (
              orders.map((order: any) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {order.purchaser_first_name} {order.purchaser_last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{order.purchaser_email}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ${((order.total_amount_cents || order.total_amount) / 100).toFixed(2)}
                      </p>
                      <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.order_items?.length || 0} tickets</p>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="scanner" className="space-y-4">
            <Card className="p-6">
              <div className="text-center space-y-4">
                <QrCode className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium mb-1">QR Scanner</p>
                  <p className="text-sm text-muted-foreground">Enable camera to scan tickets</p>
                </div>
                <Button size="sm">Enable Camera</Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block mx-auto max-w-[980px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between">
          <div>
            <Button variant="ghost" asChild>
              <Link href="/org/events">← Back to Events</Link>
            </Button>
            <h1 className="mt-2 text-3xl font-bold">{event.title}</h1>
          </div>
          <Badge variant={event.status === "published" ? "default" : "secondary"}>
            {event.status === "published" ? "Published" : "Draft"}
          </Badge>
        </div>

        {event.status === "draft" && (
          <Alert className="border-amber-500 bg-amber-50 text-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription>This event is private until published.</AlertDescription>
          </Alert>
        )}

        {event.status === "published" && (
          <Button variant="outline" className="gap-2" asChild>
            <Link href={`/events/${event.id}`}>
              <Eye className="h-4 w-4" />
              View Public Page
            </Link>
          </Button>
        )}

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
              <p className="text-2xl font-bold">{totalCheckIns}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="guestlist">Guestlist</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="scanner">Scanner</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Event Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">{new Date(primaryDate.starts_at).toLocaleString()}</p>
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Ticket Types</CardTitle>
                <Button size="sm">Add Ticket Type</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {event.ticket_types?.map((type: any) => (
                    <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{type.name}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                        <p className="text-sm text-muted-foreground">
                          ${((type.price_cents || type.price) / 100).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">
                          {(type.quantity_total || 0) - (type.quantity_remaining || 0)} / {type.quantity_total || 0}{" "}
                          sold
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {type.per_user_limit && `Max ${type.per_user_limit} per user`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Orders</CardTitle>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No orders yet</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-xs">{order.id.substring(0, 8)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{order.purchaser_email}</p>
                              <p className="text-sm text-muted-foreground">
                                {order.purchaser_first_name} {order.purchaser_last_name}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{order.order_items?.length || 0}</TableCell>
                          <TableCell className="font-medium">
                            ${((order.total_amount_cents || order.total_amount) / 100).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Waitlist</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Manage attendees waiting for tickets</p>
                </div>
                <Button size="sm">Offer Tickets</Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No waitlist entries yet. Attendees can join the waitlist when tickets are sold out.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guestlist" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Guestlist</CardTitle>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Guest
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No guestlist entries yet. Add guests to provide complimentary access.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Event Staff</CardTitle>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground py-8">
                  No staff assigned yet. Add staff members to manage check-ins and event operations.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scanner" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  QR Code Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <QrCode className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">Camera access required</p>
                    <Button size="sm">Enable Camera</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Scans</p>
                  <div className="text-center text-muted-foreground text-sm py-4">No scans yet</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
