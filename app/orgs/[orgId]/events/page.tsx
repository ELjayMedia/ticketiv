import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents } from "@/lib/demo-data"
import { Calendar, Plus, MapPin, Users, TrendingUp } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrgEventsPage({ params }: { params: { orgId: string } }) {
  const { orgId } = params
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  let events: any[] = []

  if (demoSessionCookie) {
    try {
      events = getDemoOrganizerEvents(orgId)
    } catch (error) {
      console.error("[v0] Failed to load demo events:", error)
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

    const { data: eventsData = [], error } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        date,
        status,
        cover_image_url,
        orders:order_items(count)
      `)
      .eq("org_id", orgId)
      .order("date", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching events:", error)
    }

    events = eventsData
  }

  return (
    <main className="flex-1 overflow-auto bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Events</h1>
            <p className="text-muted-foreground mt-1">Create and manage your events, track sales and revenue</p>
          </div>
          <Button asChild className="w-full sm:w-auto gap-2">
            <Link href={`/orgs/${orgId}/events/new`}>
              <Plus className="h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-card/50 py-16">
            <div className="text-center max-w-md">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Create your first event</h2>
              <p className="text-muted-foreground mb-6">Get started by creating an event and start selling tickets to your audience</p>
              <Button asChild>
                <Link href={`/orgs/${orgId}/events/new`}>Create Event</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/orgs/${orgId}/events/${event.id}`}
                className="group"
              >
                <Card className="h-full overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all duration-200 flex flex-col">
                  {/* Event Poster Image */}
                  <div className="relative w-full h-48 bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5">
                        <Calendar className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <Badge 
                        variant={event.status === "published" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {event.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Event Details */}
                  <CardHeader className="pb-3">
                    <CardTitle className="line-clamp-2 text-lg leading-tight">{event.title}</CardTitle>
                    <p className="text-sm text-muted-foreground line-clamp-1 mt-1">{event.description}</p>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {/* Event Meta */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{event.date}</span>
                      </div>
                    </div>

                    {/* Stats Footer */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Tickets Sold</p>
                        <p className="text-lg font-semibold text-foreground">{event.orders?.[0]?.count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Revenue</p>
                        <p className="text-lg font-semibold text-foreground flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-green-600" />
                          ${((event.orders?.[0]?.count || 0) * 129).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
