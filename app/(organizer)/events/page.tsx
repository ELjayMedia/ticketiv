import { getOrganizerEventMetrics } from "@/lib/events"
import { formatCurrency } from "@/lib/pricing"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function OrganizerEventsPage() {
  const events = getOrganizerEventMetrics()

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Manage Events</h1>
          <p className="text-muted-foreground">Track performance and create new experiences for your attendees.</p>
        </div>
        <Button size="lg">Create Event</Button>
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
                <span className="text-muted-foreground">Attendees</span>
                <span className="font-medium">{event.attendees.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ticket Price</span>
                <span className="font-semibold text-primary">{formatCurrency(event.ticketPrice)}</span>
              </div>
              <div className="pt-4 text-right">
                <Button variant="outline" asChild>
                  <Link href={`/events/${event.id}`}>View public page</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
