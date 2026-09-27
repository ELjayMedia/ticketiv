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

  const currentEvents = events.filter(
    (event: any) => event.lifecycle === "upcoming" || event.lifecycle === "live",
  )
  const historicalEvents = events.filter(
    (event: any) => event.lifecycle === "ended" || event.lifecycle === "cancelled",
  )

  const organizerEvents: EventCardData[] = currentEvents.map((event: any) => ({
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
  }))

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
          {organizerEvents.length > 0 ? "Upcoming & live events" : "No upcoming events"}
        </h2>
        {organizerEvents.length === 0 ? (
          <Card flat className="border-dashed">
            <div className="px-6 py-10 text-center">
              <p className="text-[13px] text-ink-3">
                No upcoming events at the moment. Check back soon for announcements.
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

      {historicalEvents.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-h2">Past events</h2>
          <div className="flex flex-col gap-2">
            {historicalEvents
              .slice()
              .sort(
                (a: any, b: any) =>
                  new Date(b.lifecycle_end_at ?? b.starts_at ?? 0).getTime() -
                  new Date(a.lifecycle_end_at ?? a.starts_at ?? 0).getTime(),
              )
              .map((event: any) => (
                <a
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-line bg-surface px-4 py-3 transition-colors hover:bg-bg"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold text-ink">{event.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] uppercase text-ink-3">
                      {event.status === "cancelled" ? "Cancelled" : "Past event"}
                    </div>
                  </div>
                  <span className="text-[12px] font-semibold text-ink-3">View →</span>
                </a>
              ))}
          </div>
        </section>
      )}
    </main>
  )
}
