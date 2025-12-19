import { getOrganizerEventMetrics } from "@/lib/events"
import { formatCurrency } from "@/lib/pricing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { Calendar, Plus, Users, Ticket, TrendingUp } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function OrganizerEventsPage() {
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")
  let organizerId: string | undefined

  if (demoSessionCookie) {
    try {
      const demoUser = JSON.parse(demoSessionCookie.value)
      organizerId = demoUser.org_id
    } catch (e) {
      console.error("[v0] Failed to parse demo session cookie:", e)
    }
  }

  if (!organizerId) {
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      redirect("/login")
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      redirect("/login")
    }

    const { data: orgMember } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", session.user.id)
      .single()

    if (!orgMember?.org_id) {
      redirect("/app/home")
    }

    organizerId = orgMember.org_id
  }

  if (!organizerId) {
    redirect("/login")
  }

  const events = await getOrganizerEventMetrics(organizerId)

  return (
    <>
      {/* Mobile View */}
      <div className="lg:hidden flex-1 space-y-4 p-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Events</h1>
          <Button size="sm" asChild>
            <Link href="/events/new">
              <Plus className="h-4 w-4 mr-1" />
              New
            </Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <Card className="p-8">
            <div className="text-center space-y-4">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-semibold mb-1">No events yet</h3>
                <p className="text-sm text-muted-foreground">Create your first event to start</p>
              </div>
              <Button asChild>
                <Link href="/events/new">Create Event</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Link key={event.id} href={`/org/events/${event.id}`}>
                <Card className="p-4 hover:border-primary transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{event.title}</h3>
                      <Badge variant={event.status === "published" ? "default" : "secondary"} className="mt-1">
                        {event.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-muted rounded">
                      <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-medium">{event.ticketsSold}</p>
                      <p className="text-muted-foreground">Sold</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <Ticket className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-medium">{event.ticketsAvailable}</p>
                      <p className="text-muted-foreground">Left</p>
                    </div>
                    <div className="text-center p-2 bg-muted rounded">
                      <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <p className="font-medium">{formatCurrency(event.minimumPrice || 0)}</p>
                      <p className="text-muted-foreground">Min</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block mx-auto max-w-[1200px] space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Manage Events</h1>
            <p className="text-muted-foreground">Track performance and create new experiences for your attendees.</p>
          </div>
          <Button size="lg" asChild>
            <Link href="/events/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>

        {events.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Calendar className="h-16 w-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">No events yet</h3>
                <p className="text-muted-foreground">Create your first event to start selling tickets</p>
              </div>
              <Button asChild size="lg">
                <Link href="/events/new">Create Event</Link>
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <Card key={event.id} className="transition hover:border-primary hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{event.title}</CardTitle>
                    <Badge variant={event.status === "published" ? "default" : "secondary"}>{event.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tickets Remaining</span>
                    <span className="font-medium">{event.ticketsAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Tickets Sold</span>
                    <span className="font-medium">{event.ticketsSold}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Minimum Price</span>
                    <span className="font-semibold text-primary">{formatCurrency(event.minimumPrice || 0)}</span>
                  </div>
                  <div className="pt-4 text-right">
                    <Button variant="outline" asChild>
                      <Link href={`/org/events/${event.id}`}>Manage Event</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
