import { getOrganizerEventMetrics } from "@/lib/events"
import { formatCurrency } from "@/lib/pricing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"

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
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Events</h1>
          <p className="text-muted-foreground">Track performance and create new experiences for your attendees.</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/events/new">Create Event</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id} className="transition hover:border-primary">
            <CardHeader>
              <CardTitle className="text-xl">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium">{event.status}</span>
              </div>
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
                  <Link href={`/events/${event.id}`}>Manage Event</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
