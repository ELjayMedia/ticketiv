import React from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents, getDemoOrganization } from "@/lib/demo-data"
import { TrendingUp, Ticket, DollarSign, Calendar, Activity, ArrowUpRight, CheckCircle2, Zap } from "lucide-react"

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
  let orgName = "Organization"
  let totalTicketsSold = 0
  let totalRevenue = 0
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
      totalTicketsSold = events.reduce((sum, event) => sum + (event.orders?.count || 0) * 2, 0)
      totalRevenue = totalTicketsSold * 129
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

    // Fetch org's events with stats (using RLS)
    const { data: eventsData = [] } = await supabase
      .from("events")
      .select(`
        id,
        title,
        status,
        date,
        orders:order_items(count)
      `)
      .eq("org_id", orgId)

    events = eventsData
    totalTicketsSold = eventsData.reduce((sum, event) => sum + (event.orders?.[0]?.count || 0), 0)
    totalRevenue = totalTicketsSold * 129 // Placeholder calculation
    activeEvents = eventsData.filter((e) => e.status === "published").length
  }

  const upcomingEvents = events.filter((e) => e.status === "published").slice(0, 3)

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
              change={`${activeEvents} publishing`}
              icon={<Ticket className="h-4 w-4" />}
            />
            <MetricCard
              label="Total Revenue"
              value={`$${(totalRevenue / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
              change="+12% from last month"
              icon={<DollarSign className="h-4 w-4" />}
            />
            <MetricCard
              label="Growth"
              value="+12%"
              change="Month over month"
              icon={<TrendingUp className="h-4 w-4" />}
            />
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
                {upcomingEvents.map((event) => (
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
                                <span>{event.date}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 ml-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Sold</p>
                            <p className="font-semibold text-foreground">{event.orders?.[0]?.count || 0}</p>
                          </div>
                          <Badge variant={event.status === "published" ? "default" : "secondary"} className="capitalize">
                            {event.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              {events.length > 3 && (
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
