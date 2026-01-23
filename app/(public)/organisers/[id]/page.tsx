import { notFound } from "next/navigation"
import { EventCard } from "@/components/events/event-card"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getPublicEvents } from "@/lib/data/events"
import type { EventSummary } from "@/types"

interface OrganizerPageProps {
  params: { id: string }
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const supabase = createServerSupabaseClient()
  let organizer: any = null
  let organizerEvents: EventSummary[] = []

  if (supabase) {
    // Fetch organizer
    const { data: orgData, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", params.id)
      .maybeSingle()

    if (!orgError && orgData) {
      organizer = orgData
    }

    // Fetch events by this organizer
    if (organizer) {
      const { data: eventData } = await supabase
        .from("events")
        .select(
          `
          id, title, slug, status, category, start_date, location,
          venues(id, name, address_line1, city, timezone),
          ticket_types(id, price_cents, currency)
        `
        )
        .eq("organizer_id", params.id)
        .eq("status", "published")
        .order("start_date", { ascending: true })

      if (eventData) {
        organizerEvents = eventData.map((event: any) => ({
          id: event.id,
          title: event.title,
          slug: event.slug,
          city: event.venues?.city || event.location || null,
          category: event.category,
          visibility: event.status,
          venues: event.venues
            ? {
                id: event.venues.id,
                name: event.venues.name,
                address: event.venues.address_line1,
                city: event.venues.city,
                tz: event.venues.timezone,
              }
            : null,
          event_dates: [{ id: `${event.id}-date`, starts_at: event.start_date, ends_at: null }],
          ticket_types: event.ticket_types || [],
        }))
      }
    }
  }

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
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
