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
  venues?: { name?: string | null } | null
}

export interface ArtistTourDate {
  id: string
  title: string
  slug: string
  /** Next occurrence for current events; the first occurrence for past ones. */
  starts_at: string
  venue_name?: string
  /** Not selected yet; kept for the page's existing venue/city line. */
  city?: string
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
