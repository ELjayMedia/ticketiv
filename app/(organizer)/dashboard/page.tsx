import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents } from "@/lib/demo-data"
import { TrendingUp, Ticket, DollarSign, Calendar, Activity, ArrowUpRight, CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrganizerDashboardPage() {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  if (demoSessionCookie) {
    try {
      const demoUser = JSON.parse(demoSessionCookie.value)
      const events = getDemoOrganizerEvents(demoUser.org_id || "demo-org-1")

      const totalTicketsSold = events.reduce((sum, event) => sum + (event.orders?.count || 0) * 2, 0)
      const totalRevenue = totalTicketsSold * 129 // Demo calculation
      const activeEvents = events.filter((e) => e.status === "published").length
      const checkedInCount = Math.floor(totalTicketsSold * 0.3)

  return (
    <main className="flex-1 overflow-auto">
      <DashboardContent
        userName={demoUser.full_name}
        activeEvents={activeEvents}
        ticketsSold={totalTicketsSold}
        revenue={totalRevenue}
        checkedIn={checkedInCount}
        events={events}
        isDemo={true}
      />
    </main>
  )
    } catch (e) {
      // Invalid demo session, continue to Supabase check
    }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) redirect("/login")

  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", session.user.id)
    .maybeSingle()

  if (!orgMember) redirect("/")

  const { data: events = [] } = await supabase
    .from("events")
    .select(`
      id,
      title,
      status,
      starts_at,
      ends_at,
      cover_image_url
    `)
    .eq("organizer_id", orgMember.org_id)
    .order("starts_at", { ascending: false })

  const { data: orders = [] } = await supabase
    .from("orders")
    .select("total_cents, status")
    .eq("org_id", orgMember.org_id)
    .eq("status", "paid")

  const { data: scans = [] } = await supabase
    .from("scans")
    .select("outcome")
    .in(
      "event_id",
      events.map((e) => e.id),
    )

  const totalTicketsSold = orders.length
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_cents || 0), 0) / 100
  const activeEvents = events.filter((e) => e.status === "published").length
  const checkedInCount = scans.filter((s) => s.outcome === "valid").length

  return (
    <main className="flex-1 overflow-auto">
      <DashboardContent
        userName={session.user.email || "Organizer"}
        activeEvents={activeEvents}
        ticketsSold={totalTicketsSold}
        revenue={totalRevenue}
        checkedIn={checkedInCount}
        events={events}
        isDemo={false}
      />
    </main>
  )
}

function DashboardContent({
  userName,
  activeEvents,
  ticketsSold,
  revenue,
  checkedIn,
  events,
  isDemo,
}: {
  userName: string
  activeEvents: number
  ticketsSold: number
  revenue: number
  checkedIn: number
  events: any[]
  isDemo: boolean
}) {
  const revenueFormatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(revenue)

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex-1 space-y-4 p-4 pt-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome, {userName.split(" ")[0] || userName.split("@")[0]}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Revenue</p>
            </div>
            <p className="text-xl font-bold">{revenueFormatted}</p>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +20%
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Ticket className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Tickets</p>
            </div>
            <p className="text-xl font-bold">{ticketsSold}</p>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +180
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <p className="text-xl font-bold">{activeEvents}</p>
            <p className="text-xs text-muted-foreground">{events.length - activeEvents} draft</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Checked In</p>
            </div>
            <p className="text-xl font-bold">{checkedIn}</p>
            <p className="text-xs text-muted-foreground">
              {ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0}%
            </p>
          </Card>
        </div>

        <Card className="p-4">
          <h3 className="font-semibold mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/org/events/new">
                <Calendar className="mr-2 h-4 w-4" />
                Create Event
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/org/events">
                <Ticket className="mr-2 h-4 w-4" />
                View Events
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full bg-transparent">
              <Link href="/org/finance">
                <DollarSign className="mr-2 h-4 w-4" />
                Finance
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Events</h3>
            <Button asChild variant="ghost" size="sm">
              <Link href="/org/events">See All</Link>
            </Button>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">No events yet</p>
              <Button asChild size="sm">
                <Link href="/org/events/new">Create Event</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.slice(0, 3).map((event: any) => (
                <Link
                  key={event.id}
                  href={`/org/events/${event.id}`}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {event.cover_image_url && (
                    <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                      <img
                        src={event.cover_image_url || "/placeholder.svg"}
                        alt={event.title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(event.starts_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={event.status === "published" ? "default" : "secondary"} className="shrink-0">
                    {event.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {isDemo && (
          <Card className="p-4 bg-muted">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">Demo Mode Active</p>
                <p className="text-xs text-muted-foreground">Connect Supabase for real event data</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block flex-1 space-y-6 p-4 pt-6 md:p-6 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {userName.split(" ")[0] || userName.split("@")[0]}</p>
          </div>
          <Button asChild>
            <Link href="/org/events">
              <Calendar className="mr-2 h-4 w-4" />
              View All Events
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{revenueFormatted}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                +20.1% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ticketsSold}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                +180 from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEvents}</div>
              <p className="text-xs text-muted-foreground">
                {events.length - activeEvents} draft{events.length - activeEvents !== 1 && "s"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Checked In</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{checkedIn}</div>
              <p className="text-xs text-muted-foreground">
                {ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0}% attendance rate
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Your latest events and their performance</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No events yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">Create your first event to start selling tickets</p>
                  <Button asChild>
                    <Link href="/org/events/new">Create Event</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.slice(0, 5).map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {event.cover_image_url && (
                          <div className="h-12 w-12 rounded overflow-hidden bg-muted">
                            <img
                              src={event.cover_image_url || "/placeholder.svg"}
                              alt={event.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-muted-foreground">
                              {new Date(event.starts_at).toLocaleDateString()}
                            </p>
                            <Badge variant={event.status === "published" ? "default" : "secondary"}>
                              {event.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/org/events/${event.id}`}>
                          View
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage your events and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full" size="lg">
                <Link href="/org/events/new">
                  <Calendar className="mr-2 h-4 w-4" />
                  Create New Event
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/org/events">
                  <Ticket className="mr-2 h-4 w-4" />
                  Manage Tickets
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full bg-transparent">
                <Link href="/org/finance">
                  <DollarSign className="mr-2 h-4 w-4" />
                  View Finance
                </Link>
              </Button>

              {isDemo && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2 flex items-center">
                    <Activity className="mr-2 h-4 w-4" />
                    Demo Mode Active
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Connect Supabase to manage real events and track live data
                  </p>
                </div>
              )}

              {!isDemo && ticketsSold > 0 && (
                <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium mb-2 flex items-center text-primary">
                    <Activity className="mr-2 h-4 w-4 animate-pulse" />
                    Live Activity
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tickets sold today</span>
                      <span className="font-medium">{Math.floor(Math.random() * 20) + 5}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Revenue today</span>
                      <span className="font-medium">${(Math.random() * 1000 + 500).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
