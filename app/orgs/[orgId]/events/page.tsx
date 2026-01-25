import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { cookies } from "next/headers"
import { getDemoOrganizerEvents } from "@/lib/demo-data"
import { Calendar, Plus, Search, Users, Ticket } from "lucide-react"

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
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events</h1>
            <p className="text-muted-foreground mt-1">Manage all events for your organization</p>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgId}/events/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search events..." className="pl-10" />
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No events yet</p>
              <Button asChild>
                <Link href={`/orgs/${orgId}/events/new`}>Create Your First Event</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/orgs/${orgId}/events/${event.id}`}
                className="group"
              >
                <Card className="h-full overflow-hidden hover:shadow-lg transition-shadow">
                  {event.cover_image_url && (
                    <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/10 overflow-hidden">
                      <img
                        src={event.cover_image_url || "/placeholder.svg"}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg line-clamp-2">{event.title}</CardTitle>
                      <Badge variant={event.status === "published" ? "default" : "secondary"} className="shrink-0">
                        {event.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Ticket className="h-4 w-4" />
                        <span>{event.orders?.[0]?.count || 0} sold</span>
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
