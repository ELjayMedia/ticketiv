import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents } from "@/lib/demo-data"
import { 
  TrendingUp, 
  Ticket, 
  DollarSign, 
  Calendar, 
  Activity, 
  ArrowUpRight, 
  CheckCircle2,
  Home,
  BarChart3,
  Users,
  Settings
} from "lucide-react"

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
        <main className="flex-1 overflow-auto bg-background">
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
    <main className="flex-1 overflow-auto bg-background">
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
    <div className="min-h-screen bg-muted/30">
      {/* Header with Navigation */}
      <div className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold hidden sm:block">Ticketiv Organizer</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <Button asChild variant="outline" size="sm" className="gap-2 bg-transparent">
              <Link href="/">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Site</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/app/profile">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
            Welcome back, {userName.split(" ")[0] || userName.split("@")[0]}. Here's your event performance at a glance.
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Main Content Area with Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Events</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Users className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
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
                        <Link href="/events/new">Create Event</Link>
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
                              <div className="h-12 w-12 rounded overflow-hidden bg-muted shrink-0">
                                <img
                                  src={event.cover_image_url || "/placeholder.svg?height=48&width=48"}
                                  alt={event.title}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {new Date(event.starts_at).toLocaleDateString()}
                                </p>
                                <Badge variant={event.status === "published" ? "default" : "secondary"} className="text-xs">
                                  {event.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/events/${event.id}`}>
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

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Manage your events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full" size="sm">
                    <Link href="/events/new">
                      <Calendar className="mr-2 h-4 w-4" />
                      Create New Event
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full bg-transparent" size="sm">
                    <Link href="/events">
                      <Ticket className="mr-2 h-4 w-4" />
                      Manage Events
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full bg-transparent" size="sm">
                    <Link href="/finance">
                      <DollarSign className="mr-2 h-4 w-4" />
                      View Finance
                    </Link>
                  </Button>

                  {isDemo && (
                    <div className="mt-6 p-4 bg-muted rounded-lg border">
                      <p className="text-sm font-medium mb-2 flex items-center">
                        <Activity className="mr-2 h-4 w-4" />
                        Demo Mode
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Using demo data. Connect Supabase for real events.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events">
            <Card>
              <CardHeader>
                <CardTitle>All Events</CardTitle>
                <CardDescription>Manage and view all your events</CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No events found</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map((event: any) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">{new Date(event.starts_at).toLocaleDateString()}</p>
                        </div>
                        <Badge variant={event.status === "published" ? "default" : "secondary"}>
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Insights</CardTitle>
                <CardDescription>View detailed metrics and performance data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Events</p>
                    <p className="text-3xl font-bold">{events.length}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Attendance Rate</p>
                    <p className="text-3xl font-bold">{ticketsSold > 0 ? Math.round((checkedIn / ticketsSold) * 100) : 0}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
