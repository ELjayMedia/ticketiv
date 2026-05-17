import { notFound } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { getEventDetailById } from "@/lib/data/public/event-detail"
import { EventHero } from "@/components/event-detail/event-hero"
import { EventActionRow } from "@/components/event-detail/event-action-row"
import { EventQuickFacts } from "@/components/event-detail/event-quick-facts"
import { TicketSelector } from "@/components/event-detail/ticket-selector"
import { EventLineup } from "@/components/event-detail/event-lineup"
import { EventVenue } from "@/components/event-detail/event-venue"
import { EventOrganizer } from "@/components/event-detail/event-organizer"
import { EventWhoGoing } from "@/components/event-detail/event-who-going"
import { EventAccordion } from "@/components/event-detail/event-accordion"
import { EventShareFooter } from "@/components/event-detail/event-share-footer"
import { SeriesBreadcrumb } from "@/components/event-detail/series-breadcrumb"

interface EventDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params
  const event = await getEventDetailById(id)

  if (!event) notFound()

  const hasArtists = event.artists.length > 0
  const isMultiDay = event.event_format === "multi_day"

  return (
    <>
      {/* ── Hero & action row (shared) ─────────────────────── */}
      <EventHero event={event} />
      <EventActionRow eventTitle={event.title} eventId={event.id} initialFavourited={event.is_favourited} />

      {/* ══════════════════════════════════════════════════════
          MOBILE LAYOUT  (< lg)
      ══════════════════════════════════════════════════════ */}
      <div className="lg:hidden">
        <main className="space-y-6 px-4 pb-32 pt-4">
          {/* Title block */}
          <section aria-label="Event title">
            {event.series && (
              <div className="mb-1.5">
                <SeriesBreadcrumb series={event.series} />
              </div>
            )}
            <h2 className="font-display text-2xl font-bold leading-tight">{event.title}</h2>
            {event.city && (
              <p className="mt-1 text-sm text-muted-foreground">{event.city}</p>
            )}
          </section>

          {/* Quick facts */}
          <EventQuickFacts event={event} />

          {/* Ticket selector + sticky buy bar */}
          <section aria-labelledby="tickets-heading-mobile">
            <h2 id="tickets-heading-mobile" className="mb-3 font-display text-xl font-bold">
              Tickets
            </h2>
            <TicketSelector
              eventId={event.id}
              ticketTypes={event.ticket_types}
              variant="mobile"
              multiDay={isMultiDay}
            />
          </section>

          <Separator />

          {/* About */}
          <section aria-labelledby="about-heading-mobile">
            <h2 id="about-heading-mobile" className="mb-2 font-display text-xl font-bold">
              About this event
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {event.description ?? "No description provided yet."}
            </p>
          </section>

          {/* Lineup */}
          {hasArtists && (
            <>
              <Separator />
              <EventLineup artists={event.artists} />
            </>
          )}

          <Separator />

          {/* Venue */}
          <EventVenue venue={event.venue} />

          {/* Organizer */}
          {event.organization && (
            <>
              <Separator />
              <EventOrganizer organization={event.organization} />
            </>
          )}

          {/* Who&apos;s going */}
          {(event.buyer_count > 0 || event.friends_going.length > 0) && (
            <>
              <Separator />
              <EventWhoGoing
                buyerCount={event.buyer_count}
                friendsGoing={event.friends_going}
              />
            </>
          )}

          <Separator />

          {/* Details accordion */}
          <EventAccordion />

          <Separator />

          {/* Share footer */}
          <EventShareFooter eventTitle={event.title} eventId={event.id} initialFavourited={event.is_favourited} />
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════
          DESKTOP LAYOUT  (≥ lg)
      ══════════════════════════════════════════════════════ */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1200px] px-8 py-8">
          <div className="grid grid-cols-12 gap-8">
            {/* ── Left column: content (8/12) ──────────────── */}
            <div className="col-span-8 space-y-8">
              {/* Title block */}
              <section aria-label="Event title">
                {event.series && (
                  <div className="mb-2">
                    <SeriesBreadcrumb series={event.series} />
                  </div>
                )}
                <h2 className="font-display text-3xl font-bold leading-tight">{event.title}</h2>
                {event.city && (
                  <p className="mt-1 text-muted-foreground">{event.city}</p>
                )}
              </section>

              {/* About */}
              <section aria-labelledby="about-heading-desktop">
                <h2 id="about-heading-desktop" className="mb-2 font-display text-xl font-bold">
                  About this event
                </h2>
                <p className="leading-relaxed text-muted-foreground whitespace-pre-line">
                  {event.description ?? "No description provided yet."}
                </p>
              </section>

              {/* Lineup */}
              {hasArtists && (
                <>
                  <Separator />
                  <EventLineup artists={event.artists} />
                </>
              )}

              <Separator />

              {/* Details accordion */}
              <EventAccordion />

              <Separator />

              {/* Share footer */}
              <EventShareFooter eventTitle={event.title} eventId={event.id} initialFavourited={event.is_favourited} />
            </div>

            {/* ── Right column: sidebar (4/12) ──────────────── */}
            <div className="col-span-4">
              <div className="sticky top-8 space-y-6">
                {/* Quick facts */}
                <EventQuickFacts event={event} />

                {/* Ticket selector */}
                <section aria-labelledby="tickets-heading-desktop">
                  <h2 id="tickets-heading-desktop" className="mb-3 font-display text-lg font-bold">
                    Tickets
                  </h2>
                  <TicketSelector
                    eventId={event.id}
                    ticketTypes={event.ticket_types}
                    variant="desktop"
                    multiDay={isMultiDay}
                  />
                </section>

                {/* Venue */}
                <EventVenue venue={event.venue} />

                {/* Organizer */}
                {event.organization && (
                  <EventOrganizer organization={event.organization} />
                )}

                {/* Who&apos;s going */}
                {(event.buyer_count > 0 || event.friends_going.length > 0) && (
                  <EventWhoGoing
                    buyerCount={event.buyer_count}
                    friendsGoing={event.friends_going}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
