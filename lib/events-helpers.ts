import type {
  EventDateRecord,
  EventDetail,
  EventRecord,
  EventSummary,
  TicketTypeRecord,
  VenueRecord,
} from "@/types"

export const EVENT_SUMMARY_SELECTION = `
  *,
  event_dates!event_dates_event_id_fkey(*),
  ticket_types!ticket_types_event_id_fkey(*),
  venue:venues(*)
`

export interface RawEvent extends EventRecord {
  event_dates?: EventDateRecord[] | null
  ticket_types?: TicketTypeRecord[] | null
  venue?: VenueRecord | null
}

function getPrimaryDate(dates?: EventDateRecord[] | null) {
  if (!dates || dates.length === 0) return null
  const explicitPrimary = dates.find((date) => date.is_primary)
  if (explicitPrimary) {
    return explicitPrimary
  }
  return [...dates].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0]
}

function deriveLocation(event: RawEvent): string | null {
  if (event.location) {
    return event.location
  }
  const venue = event.venue
  if (venue) {
    const parts = [venue.city, venue.region, venue.country].filter(Boolean)
    if (parts.length > 0) {
      return parts.join(", ")
    }
    if (venue.name) {
      return venue.name
    }
  }
  return null
}

function deriveMinimumPrice(ticketTypes?: TicketTypeRecord[] | null): number | null {
  if (!ticketTypes || ticketTypes.length === 0) {
    return null
  }
  const prices = ticketTypes.map((ticket) => ticket.price).filter((value) => typeof value === "number")
  if (prices.length === 0) {
    return null
  }
  return Math.min(...prices)
}

export function mapToSummary(event: RawEvent): EventSummary {
  const primaryDate = getPrimaryDate(event.event_dates ?? undefined)
  const minimumPrice = deriveMinimumPrice(event.ticket_types ?? undefined)

  return {
    id: event.id,
    slug: event.slug ?? null,
    title: event.title,
    summary: event.summary ?? event.description,
    description: event.description,
    category: event.category ?? null,
    status: event.status,
    currency: event.currency,
    cover_image_url: event.cover_image_url ?? null,
    venue_name: event.venue?.name ?? null,
    location: deriveLocation(event),
    starts_at: primaryDate?.starts_at ?? event.starts_at ?? null,
    ends_at: primaryDate?.ends_at ?? event.ends_at ?? null,
    minimum_price: minimumPrice,
    tickets_available: event.tickets_available ?? null,
    tickets_sold: event.tickets_sold ?? null,
    organizer_id: event.organizer_id ?? null,
  }
}

export function mapToDetail(event: RawEvent): EventDetail {
  const summary = mapToSummary(event)

  return {
    ...summary,
    full_description: event.full_description ?? event.description,
    banner_image_url: event.banner_image_url ?? null,
    timezone: event.timezone,
    ticket_types: event.ticket_types ?? [],
    dates: event.event_dates ?? [],
    venue: event.venue ?? null,
  }
}
