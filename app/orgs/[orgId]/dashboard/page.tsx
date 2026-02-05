import React from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents, getDemoOrganization } from "@/lib/demo-data"
import { getOrgEventKPIs } from "@/lib/adapters/kpis"
import { TrendingUp, Ticket, DollarSign, Calendar, Activity, ArrowUpRight, CheckCircle2, Zap, Users } from "lucide-react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export const dynamic = "force-dynamic"

interface DashboardMetric {
  label: string
  value: string
  change?: string
  icon: React.ReactNode
}

function MetricCard({ label, value, change, icon }: DashboardMetric) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change && <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" />
          {change}
        </p>}
      </CardContent>
    </Card>
  )
}

export default async function OrgDashboardPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let events: any[] = []
  let kpis: any[] = []
  let orgName = "Organization"
  let totalTicketsSold = 0
  let totalRevenue = 0
  let totalCheckedIn = 0
  let activeEvents = 0

  if (demoSessionCookie) {
    try {
      const demoUser = JSON.parse(demoSessionCookie.value)
      const org = getDemoOrganization(orgId)
      if (!org) {
        return redirect("/403")
      }
      orgName = org.name
      events = getDemoOrganizerEvents(orgId)
      
      // Synthesize KPI data from demo events
      kpis = events.map((event) => ({
        event_id: event.id,
        event_title: event.title,
        event_date: event.starts_at,
        total_tickets_sold: Math.floor(Math.random() * 300) + 20,
        total_checked_in: Math.floor(Math.random() * 200) + 10,
        total_revenue_cents: Math.floor(Math.random() * 50000) + 5000,
        attendance_rate: Math.random() * 0.8,
      }))
      
      totalTicketsSold = kpis.reduce((sum, kpi) => sum + kpi.total_tickets_sold, 0)
      totalRevenue = kpis.reduce((sum, kpi) => sum + kpi.total_revenue_cents, 0)
      totalCheckedIn = kpis.reduce((sum, kpi) => sum + kpi.total_checked_in, 0)
      activeEvents = events.filter((e) => e.status === "published").length
    } catch (error) {
      console.error("[v0] Failed to load demo data:", error)
    }
  } else {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      return redirect("/login")
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return redirect("/login")
    }

    // Fetch org details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, id")
      .eq("id", orgId)
      .maybeSingle()

    if (orgError || !org) {
      console.error("[v0] Error fetching org:", orgError)
      return redirect("/403")
    }

    orgName = org.name

    // Fetch KPIs for all org events
    kpis = await getOrgEventKPIs(orgId)

    // Fetch org's events with basic info
    const { data: eventsData = [] } = await supabase
      .from("events")
      .select("id, title, status, starts_at")
      .eq("org_id", orgId)

    events = eventsData
    totalTicketsSold = kpis.reduce((sum, kpi) => sum + kpi.total_tickets_sold, 0)
    totalRevenue = kpis.reduce((sum, kpi) => sum + kpi.total_revenue_cents, 0)
    totalCheckedIn = kpis.reduce((sum, kpi) => sum + kpi.total_checked_in, 0)
    activeEvents = eventsData.filter((e) => e.status === "published").length
  }

  const upcomingEvents = events.filter((e) => e.status === "published").slice(0, 5)
  
  // Prepare chart data
  const chartData = kpis.slice(0, 6).map((kpi) => ({
    name: kpi.event_title.substring(0, 15),
    tickets: kpi.total_tickets_sold,
    revenue: kpi.total_revenue_cents / 100,
    checkedIn: kpi.total_checked_in,
  }))
  
  const attendanceData = kpis.slice(0, 6).map((kpi) => ({
    name: kpi.event_title.substring(0, 15),
    attended: kpi.total_checked_in,
    notAttended: kpi.total_tickets_sold - kpi.total_checked_in,
  }))

  const COLORS = ["#3b82f6", "#ef4444"]

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{orgName} Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's your event overview</p>
          </div>
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/orgs/${orgId}/events/new`}>+ Create Event</Link>
          </Button>
        </div>

        {/* KPI Cards */}
        {events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Active Events"
              value={activeEvents.toString()}
              change={`${events.length} total`}
              icon={<Calendar className="h-4 w-4" />}
            />
            <MetricCard
              label="Tickets Sold"
              value={totalTicketsSold.toString()}
              change={`${totalCheckedIn} checked in`}
              icon={<Ticket className="h-4 w-4" />}
            />
            <MetricCard
              label="Total Revenue"
              value={`$${(totalRevenue / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              change={`${((totalCheckedIn / totalTicketsSold) * 100).toFixed(0)}% attendance`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <MetricCard
              label="Avg Check-in"
              value={totalTicketsSold > 0 ? `${((totalCheckedIn / totalTicketsSold) * 100).toFixed(0)}%` : "0%"}
              change="Attendance rate"
              icon={<CheckCircle2 className="h-4 w-4" />}
            />
          </div>
        )}

        {/* Charts and Analytics */}
        {events.length > 0 && kpis.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Tickets Sold by Event */}
            <Card>
              <CardHeader>
                <CardTitle>Tickets Sold by Event</CardTitle>
                <CardDescription>Top events by ticket sales</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Bar dataKey="tickets" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Event */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Event</CardTitle>
                <CardDescription>Total revenue per event</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Check-in Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance by Event</CardTitle>
                <CardDescription>Check-in vs No Show</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)" }}
                      labelStyle={{ color: "var(--foreground)" }}
                    />
                    <Legend />
                    <Bar dataKey="attended" fill="#10b981" name="Checked In" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="notAttended" fill="#f3f4f6" name="No Show" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Overall Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key metrics across all events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Total Events</span>
                  <span className="font-semibold">{events.length}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Active Events</span>
                  <span className="font-semibold">{activeEvents}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Total Tickets</span>
                  <span className="font-semibold text-lg">{totalTicketsSold.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="font-semibold text-lg">${(totalRevenue / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-muted-foreground">Avg Ticket Price</span>
                  <span className="font-semibold text-lg">${(totalRevenue / Math.max(totalTicketsSold, 1) / 100).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upcoming Events or Empty State */}
        {events.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-primary/10 p-3 mb-4">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Create your first event</h2>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                Get started by creating an event and start selling tickets to your audience. Our simple wizard will guide you through the process.
              </p>
              <Button asChild size="lg">
                <Link href={`/orgs/${orgId}/events/new`}>Create Event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-4">Recent Events</h2>
              <div className="space-y-3">
                {upcomingEvents.map((event) => {
                  const eventKpi = kpis.find((k) => k.event_id === event.id)
                  return (
                    <Link
                      key={event.id}
                      href={`/orgs/${orgId}/events/${event.id}`}
                      className="block"
                    >
                      <Card className="hover:shadow-md hover:border-primary/50 transition-all">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">{event.title}</h3>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(event.starts_at).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 ml-4">
                            <div className="text-right hidden sm:block">
                              <p className="text-sm text-muted-foreground">Sold</p>
                              <p className="font-semibold text-foreground">{eventKpi?.total_tickets_sold || 0}</p>
                            </div>
                            <div className="text-right hidden sm:block">
                              <p className="text-sm text-muted-foreground">Revenue</p>
                              <p className="font-semibold text-foreground">${((eventKpi?.total_revenue_cents || 0) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Check-in</p>
                              <p className="font-semibold text-foreground">{eventKpi?.total_checked_in || 0}</p>
                            </div>
                            <Badge variant={event.status === "published" ? "default" : "secondary"} className="capitalize">
                              {event.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
              {events.length > 5 && (
                <Button asChild variant="outline" className="w-full mt-4">
                  <Link href={`/orgs/${orgId}/events`}>View All Events ({events.length})</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
