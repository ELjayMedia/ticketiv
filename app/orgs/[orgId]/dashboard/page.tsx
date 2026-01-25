import React from "react"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents, getDemoOrganization } from "@/lib/demo-data"
import { TrendingUp, Ticket, DollarSign, Calendar, Activity, ArrowUpRight, CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface DashboardMetric {
  label: string
  value: string
  change?: string
  icon: React.ReactNode
}

function MetricCard({ label, value, change, icon }: DashboardMetric) {
  return (
    <Card>
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

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{orgName}</h1>
            <p className="text-muted-foreground mt-1">Organization Overview</p>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgId}/events/new`}>+ Create Event</Link>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Active Events"
            value={activeEvents.toString()}
            change={`${events.length} total`}
            icon={<Calendar className="h-4 w-4" />}
          />
          <MetricCard
            label="Tickets Sold"
            value={totalTicketsSold.toString()}
            icon={<Ticket className="h-4 w-4" />}
          />
          <MetricCard
            label="Revenue"
            value={`$${(totalRevenue / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
            icon={<DollarSign className="h-4 w-4" />}
          />
          <MetricCard
            label="Growth"
            value="+12%"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Events</CardTitle>
            <CardDescription>Events in this organization</CardDescription>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground">No events yet. Create your first event to get started.</p>
                <Button asChild className="mt-4">
                  <Link href={`/orgs/${orgId}/events/new`}>Create Event</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {events.slice(0, 5).map((event) => (
                  <Link
                    key={event.id}
                    href={`/orgs/${orgId}/events/${event.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant={event.status === "published" ? "default" : "secondary"}>
                      {event.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
