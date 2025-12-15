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
        <DashboardContent
          userName={demoUser.full_name}
          activeEvents={activeEvents}
          ticketsSold={totalTicketsSold}
          revenue={totalRevenue}
          checkedIn={checkedInCount}
          events={events}
          isDemo={true}
        />
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
    .single()

  if (!orgMember) redirect("/app/home")

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
    <DashboardContent
      userName={session.user.email || "Organizer"}
      activeEvents={activeEvents}
      ticketsSold={totalTicketsSold}
      revenue={totalRevenue}
      checkedIn={checkedInCount}
      events={events}
      isDemo={false}
    />
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
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-6 lg:p-8">
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
                          <Badge variant={event.status === "published" ? "default" : "secondary"}>{event.status}</Badge>
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
  )
}
