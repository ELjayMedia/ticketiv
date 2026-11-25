// TICK-461 / TICK-485 / TICK-486 — artist booking requests: shared copy.
import { formatMoney } from "@/lib/venues/marketplace"

export type BookingStatus = "open" | "countered" | "accepted" | "declined" | "withdrawn"

export function bookingStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Waiting for the artist"
    case "countered":
      return "Counter-offer"
    case "accepted":
      return "Confirmed"
    case "declined":
      return "Declined"
    case "withdrawn":
      return "Withdrawn"
    default:
      return status
  }
}

/** "SZL 5,000 – 8,000", "Up to SZL 8,000", "From SZL 5,000", or null. */
export function formatOffer(min: number | null, max: number | null, currency: string): string | null {
  if (min != null && max != null) return min === max ? formatMoney(min, currency) : `${formatMoney(min, currency)} – ${(max / 100).toLocaleString("en-GB")}`
  if (max != null) return `Up to ${formatMoney(max, currency)}`
  if (min != null) return `From ${formatMoney(min, currency)}`
  return null
}

export function isOpenBooking(status: string): boolean {
  return status === "open" || status === "countered"
}

export const BOOKING_ERROR_COPY: Record<string, string> = {
  artist_not_claimed: "This artist hasn't claimed their profile yet, so they can't receive booking requests.",
  event_not_found: "Choose one of your organisation's events.",
  event_title_required: "Name the event.",
  dates_invalid: "Choose a date in the future.",
  offer_invalid: "The lowest offer must not be more than the highest.",
  message_required: "Write a short message (at least 10 characters).",
  booking_rate_limited: "You've sent 10 booking requests today. Try again tomorrow.",
  booking_open_limit: "You already have 2 open requests with this artist. Wait for an answer first.",
  request_closed: "This request is closed.",
  request_not_open: "This request has already been answered.",
  request_not_countered: "There is no counter-offer to accept.",
  request_not_accepted: "Only a confirmed booking can be linked to an event.",
  counter_required: "Enter your fee for the counter-offer.",
  action_invalid: "That action isn't available.",
  announcement_required: "Write a title and a message.",
  announcement_rate_limited: "You can post 3 announcements a week. Try again in a few days.",
  forbidden: "Your role can't do this.",
}

export function bookingErrorMessage(error: { message?: string | null; code?: string | null } | null | undefined): string {
  const message = error?.message ?? ""
  const key = Object.keys(BOOKING_ERROR_COPY).find((k) => message.includes(k))
  if (key) return BOOKING_ERROR_COPY[key]
  if (error?.code === "42501") return BOOKING_ERROR_COPY.forbidden
  return "Something went wrong. Please try again."
}

export interface ArtistInsights {
  followers: number
  followers30d: number
  pastEvents: number
  upcomingEvents: number
  ticketsSold: number
  checkedIn: number
  confirmedBookings: number
  openRequests: number
  events: Array<{ eventId: string; title: string; slug: string | null; startsAt: string | null; ticketsSold: number; checkedIn: number }>
}

const n = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0)

export function parseArtistInsights(raw: unknown): ArtistInsights | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.followers !== "number") return null
  return {
    followers: n(r.followers),
    followers30d: n(r.followers_30d),
    pastEvents: n(r.past_events),
    upcomingEvents: n(r.upcoming_events),
    ticketsSold: n(r.tickets_sold),
    checkedIn: n(r.checked_in),
    confirmedBookings: n(r.confirmed_bookings),
    openRequests: n(r.open_requests),
    events: (Array.isArray(r.events) ? (r.events as Array<Record<string, unknown>>) : []).map((e) => ({
      eventId: String(e.event_id ?? ""),
      title: String(e.title ?? ""),
      slug: typeof e.slug === "string" ? e.slug : null,
      startsAt: typeof e.starts_at === "string" ? e.starts_at : null,
      ticketsSold: n(e.tickets_sold),
      checkedIn: n(e.checked_in),
    })),
  }
}

/** Share of ticket holders who were scanned in, as a whole percentage. */
export function turnoutPct(ticketsSold: number, checkedIn: number): number | null {
  return ticketsSold > 0 ? Math.round((100 * checkedIn) / ticketsSold) : null
}
