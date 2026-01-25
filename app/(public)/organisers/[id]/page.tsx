import { CardDescription } from "@/components/ui/card"
import { notFound } from "next/navigation"
import { EventCardStandard as EventCard } from "@/components/standardized/event-card-standard"
import type { EventCardData } from "@/components/standardized/event-card-standard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getOrganiserDetail, getOrganiserEvents } from "@/lib/data/public"
import EventCardStandard from "@/components/standardized/event-card-standard" // Import EventCardStandard

interface OrganizerPageProps {
  params: { id: string }
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const organizer = await getOrganiserDetail(params.id)
  const events = await getOrganiserEvents(params.id)

  const organizerEvents: EventCardData[] = events.map((event) => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    poster_url: event.poster_url,
    starts_at: event.starts_at,
    city: event.city,
    venue_name: event.venue_name,
    min_price_cents: event.min_price_cents,
    max_price_cents: event.max_price_cents,
    currency: event.currency,
    is_promoted: event.is_promoted,
    organizer_name: organizer.name,
    tickets_remaining: event.tickets_remaining,
  }))

  if (!organizer) {
    notFound()
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6 sm:space-y-8">
      {/* Organizer Header */}
      <Card className="overflow-hidden">
        <div className="relative h-48 sm:h-64 bg-gradient-to-br from-primary/10 to-primary/5" />
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-20 w-20 sm:h-24 sm:w-24 overflow-hidden rounded-lg border-4 border-background -mt-12 sm:-mt-16 bg-muted flex items-center justify-center">
            {organizer.logo_url ? (
              <img
                src={organizer.logo_url || "/placeholder.svg"}
                alt={organizer.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">
                {organizer.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">Event Organiser</Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl">{organizer.name}</CardTitle>
            {organizer.city && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{organizer.city}</Badge>
              </div>
            )}
            {organizer.description && (
              <CardDescription className="text-sm sm:text-base line-clamp-2">{organizer.description}</CardDescription>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Events Section */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          {organizerEvents.length > 0 ? "Events by this organiser" : "No events yet"}
        </h2>
        {organizerEvents.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-muted-foreground text-sm sm:text-base">
              No events published yet. Check back soon for announcements!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {organizerEvents.map((event) => (
              <EventCard key={event.id} event={event} /> // Use EventCard instead of EventCardStandard
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
