import type { VenueCalendar } from "@/lib/venues/marketplace-data"

export interface CalendarRow {
  kind: "booking" | "block" | "event"
  id: string
  label: string
  startsAt: string
  endsAt: string
  spaceId: string | null
  enquiryId: string | null
  slug: string | null
}

const SIX_HOURS = 6 * 3600 * 1000

/**
 * One chronological list of what holds the venue. Cancelled bookings are left
 * out; an event created from a booking is shown once, as the booking.
 */
export function buildCalendarRows(calendar: VenueCalendar): CalendarRow[] {
  const bookedEvents = new Set(calendar.bookings.filter((b) => b.status === "confirmed" && b.eventId).map((b) => b.eventId as string))
  const rows: CalendarRow[] = [
    ...calendar.bookings
      .filter((b) => b.status === "confirmed")
      .map((b) => ({ kind: "booking" as const, id: b.id, label: b.orgName ?? "Organiser", startsAt: b.startsAt, endsAt: b.endsAt, spaceId: b.spaceId, enquiryId: b.enquiryId, slug: null })),
    ...calendar.blocks.map((k) => ({ kind: "block" as const, id: k.id, label: k.note ?? "", startsAt: k.startsAt, endsAt: k.endsAt, spaceId: k.spaceId, enquiryId: null, slug: null })),
    ...calendar.events
      .filter((e) => !bookedEvents.has(e.id))
      .map((e) => ({
        kind: "event" as const,
        id: e.id,
        label: e.title,
        startsAt: e.startsAt,
        endsAt: e.endsAt ?? new Date(new Date(e.startsAt).getTime() + SIX_HOURS).toISOString(),
        spaceId: null,
        enquiryId: null,
        slug: e.slug,
      })),
  ]
  return rows.sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}
