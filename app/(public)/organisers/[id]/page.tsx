import { notFound } from "next/navigation"

import { EventCardStandard as EventCard, type EventCardData } from "@/components/standardized/event-card-standard"
import { Card } from "@/components/quiet/ui/card"
import { Chip } from "@/components/quiet/ui/chip"
import { getOrganiserDetail, getOrganiserEvents } from "@/lib/data/public"

interface OrganizerPageProps {
  params: Promise<{ id: string }>
}

export default async function OrganizerPage({ params }: OrganizerPageProps) {
  const { id } = await params
  const organizer = await getOrganiserDetail(id)
  if (!organizer) notFound()

  const events = await getOrganiserEvents(id)
  const currentEvents = events.filter((event: any) => event.lifecycle === "upcoming" || event.lifecycle === "live")
  const pastEvents = events.filter((event: any) => event.lifecycle === "ended")
  const cancelledEvents = events.filter((event: any) => event.lifecycle === "cancelled")

  const mapEvent = (event: any): EventCardData => ({
    id: event.id,
    slug: event.slug,
    title: event.title,
    poster_url: event.poster_url ?? null,
    starts_at: event.starts_at ?? "",
    city: event.city ?? null,
    venue_name: event.venue_name ?? null,
    min_price_cents: event.min_price_cents ?? null,
    max_price_cents: event.max_price_cents ?? null,
    currency: event.currency,
    is_promoted: event.is_promoted ?? false,
    organizer_name: organizer.name,
    organizer_logo_url: (organizer as any).logo ?? null,
    tickets_remaining: event.tickets_remaining,
    tickets_sold: event.tickets_sold ?? null,
  })

  const organizerEvents: EventCardData[] = currentEvents.map(mapEvent)
  const organizerPastEvents: EventCardData[] = pastEvents.map(mapEvent)
  const organizerCancelledEvents: EventCardData[] = cancelledEvents.map(mapEvent)

  return (
    <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Card className="overflow-hidden">
        <div className="h-40 w-full bg-gradient-to-br from-accent-soft to-bg sm:h-56" />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-start sm:px-6 sm:pb-6">
          <div className="-mt-12 flex h-20 w-20 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border-4 border-surface bg-bg sm:-mt-16 sm:h-24 sm:w-24">
            {(organizer as any).logo ? (
              <img src={(organizer as any).logo} alt={organizer.name} className="h-full w-full object-cover" />
            ) : (
              <div className="font-mono text-[22px] font-semibold text-ink-3">
                {organizer.name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-2 pt-2">
            <Chip size="sm" variant="default" className="w-fit">Event organiser</Chip>
            <h1 className="text-h1 sm:text-[28px]">{organizer.name}</h1>
            {organizer.bio && (
              <p className="line-clamp-2 text-[14px] leading-relaxed text-ink-3">{organizer.bio}</p>
            )}
          </div>
        </div>
      </Card>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">
          {organizerEvents.length > 0 ? "Upcoming events" : "No upcoming events"}
        </h2>
        {organizerEvents.length === 0 ? (
          <Card flat className="border-dashed">
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-ink-3">
                No upcoming events at the moment. Past events remain available below.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizerEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>

      {organizerPastEvents.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-line pt-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">History</p>
            <h2 className="text-h2">Past events</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizerPastEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}

      {organizerCancelledEvents.length > 0 && (
        <section className="flex flex-col gap-4 border-t border-line pt-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-ink-3">History</p>
            <h2 className="text-h2">Cancelled events</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizerCancelledEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
