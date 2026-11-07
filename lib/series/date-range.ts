import { format } from "date-fns"

import { DEFAULT_EVENT_TIME_ZONE, formatInTimeZone, zonedParts } from "@ticketiv/shared"

const TZ = DEFAULT_EVENT_TIME_ZONE
const fmt = (d: Date, options: Intl.DateTimeFormatOptions) => formatInTimeZone(d, options, TZ)

/**
 * Compact date pill for multi-day events.
 * Same month: "14–16 Nov"
 * Cross-month, same year: "30 Nov – 2 Dec"
 * Cross-year: "30 Dec 2026 – 1 Jan 2027"
 */
export function formatMultiDayPill(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Date TBA"

  // Event days are counted where the event happens, not on the server's clock.
  const s = zonedParts(start, TZ)
  const e = zonedParts(end, TZ)
  const sameYear = s.year === e.year
  const sameMonth = sameYear && s.month === e.month

  if (sameMonth) {
    return `${s.day}–${fmt(end, { day: "numeric", month: "short" })}`
  }
  if (sameYear) {
    return `${fmt(start, { day: "numeric", month: "short" })} – ${fmt(end, { day: "numeric", month: "short" })}`
  }
  return `${fmt(start, { day: "numeric", month: "short", year: "numeric" })} – ${fmt(end, { day: "numeric", month: "short", year: "numeric" })}`
}

/**
 * Long, human-readable range with weekdays & times.
 * "Fri 14 Nov 10:00 — Sun 16 Nov 23:00"
 */
export function formatMultiDayLong(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Date TBA"
  const long = (d: Date) =>
    `${fmt(d, { weekday: "short", day: "numeric", month: "short" })} ${fmt(d, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`
  return `${long(start)} — ${long(end)}`
}

/**
 * Date range for series schedule subtitle.
 * "Jun 2026 – May 2027" (months), or fallback to single date if only one supplied.
 */
export function formatSeriesDateRange(startsOn: string | null, endsOn: string | null): string | null {
  if (!startsOn && !endsOn) return null
  const start = startsOn ? new Date(startsOn) : null
  const end = endsOn ? new Date(endsOn) : null
  if (start && end) {
    if (start.getFullYear() === end.getFullYear()) {
      return `${format(start, "MMM")} – ${format(end, "MMM yyyy")}`
    }
    return `${format(start, "MMM yyyy")} – ${format(end, "MMM yyyy")}`
  }
  if (start) return `From ${format(start, "MMM yyyy")}`
  if (end) return `Until ${format(end, "MMM yyyy")}`
  return null
}
