import { DEFAULT_EVENT_TIME_ZONE } from "@ticketiv/shared"
import { deriveEventLifecycle, type EventLifecycleState } from "@/lib/events/lifecycle"

/** Raw `event_artists → events` relation as selected by the artist page. */
export interface ArtistEventRow {
  id: string
  title: string
  slug: string
  starts_at?: string | null
  ends_at?: string | null
  status?: string | null
  cancelled_at?: string | null
  event_dates?: Array<{ starts_at?: string | null; ends_at?: string | null }> | null
  venues?: { name?: string | null; slug?: string | null; city?: string | null; tz?: string | null } | null
}

export interface ArtistTourDate {
  id: string
  title: string
  slug: string
  /** Next occurrence for current events; the first occurrence for past ones. */
  starts_at: string
  venue_name?: string
  /** Public venue page slug, when the venue is listed. */
  venue_slug?: string
  city?: string
  /** Venue time zone, so dates read in local time. */
  tz?: string
  display_order: number
  lifecycle: EventLifecycleState
}

function ms(value?: string | null): number {
  const parsed = value ? new Date(value).getTime() : Number.NaN
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function toArtistTourDate(event: ArtistEventRow, displayOrder: number, nowMs: number = Date.now()): ArtistTourDate {
  const dates = (event.event_dates ?? [])
    .filter((date) => Number.isFinite(ms(date?.starts_at)))
    .sort((a, b) => ms(a.starts_at) - ms(b.starts_at))
  const first = dates[0]
  const final = dates.reduce<(typeof dates)[number] | undefined>(
    (latest, date) => (!latest || ms(date.ends_at ?? date.starts_at) > ms(latest.ends_at ?? latest.starts_at) ? date : latest),
    undefined,
  )
  const next = dates.find((date) => ms(date.starts_at) >= nowMs)

  // Cancellation is the explicit cancelled_at marker; schedule (final occurrence end) drives the rest.
  const lifecycle = deriveEventLifecycle({
    status: event.cancelled_at ? "cancelled" : event.status,
    eventStartsAt: first?.starts_at ?? event.starts_at ?? null,
    eventEndsAt: final?.ends_at ?? final?.starts_at ?? event.ends_at ?? event.starts_at ?? null,
    nowMs,
  })

  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    starts_at: next?.starts_at ?? first?.starts_at ?? event.starts_at ?? "",
    venue_name: event.venues?.name ?? undefined,
    venue_slug: event.venues?.slug ?? undefined,
    city: event.venues?.city ?? undefined,
    tz: event.venues?.tz ?? undefined,
    display_order: displayOrder,
    lifecycle,
  }
}

/** Current (upcoming/live, soonest first) and past (ended/cancelled, most recent first) appearances. */
export function splitArtistTourDates(dates: ArtistTourDate[]) {
  const current = dates
    .filter((date) => date.lifecycle === "upcoming" || date.lifecycle === "live")
    .sort((a, b) => ms(a.starts_at) - ms(b.starts_at) || a.display_order - b.display_order)
  const past = dates
    .filter((date) => date.lifecycle === "ended" || date.lifecycle === "cancelled")
    .sort((a, b) => ms(b.starts_at) - ms(a.starts_at))
  return { current, past }
}

/** Date parts for a tour-date row, in the venue's own time zone. */
export function tourDateParts(startsAt: string, tz: string = DEFAULT_EVENT_TIME_ZONE) {
  const d = new Date(startsAt)
  if (!Number.isFinite(d.getTime())) return null
  const part = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, ...opts }).format(d)
  return {
    month: part({ month: "short" }).toUpperCase(),
    day: part({ day: "numeric" }),
    weekday: part({ weekday: "short" }),
    time: part({ hour: "2-digit", minute: "2-digit", hour12: false }),
    year: part({ year: "numeric" }),
    /** e.g. "December 2026", used to group rows under a month heading. */
    monthLabel: part({ month: "long", year: "numeric" }),
  }
}

/** Group dates (already sorted) under month headings, keeping order. */
export function groupTourDatesByMonth(dates: ArtistTourDate[]) {
  const groups: Array<{ label: string; dates: ArtistTourDate[] }> = []
  for (const date of dates) {
    const label = tourDateParts(date.starts_at, date.tz)?.monthLabel ?? "Date to be announced"
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.dates.push(date)
    else groups.push({ label, dates: [date] })
  }
  return groups
}

/** Distinct cities across the dates, in first-seen order. */
export function tourCities(dates: ArtistTourDate[]): string[] {
  return [...new Set(dates.map((d) => d.city?.trim()).filter((c): c is string => Boolean(c)))]
}

/** An artist URL segment is either the profile id (uuid) or its slug. */
export function isArtistId(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)
}

export function artistHref(artist: { id: string; slug?: string | null }): string {
  return `/artists/${encodeURIComponent(artist.slug || artist.id)}`
}
