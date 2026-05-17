import { format } from "date-fns"

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

  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()

  if (sameMonth) {
    return `${format(start, "d")}–${format(end, "d MMM")}`
  }
  if (sameYear) {
    return `${format(start, "d MMM")} – ${format(end, "d MMM")}`
  }
  return `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`
}

/**
 * Long, human-readable range with weekdays & times.
 * "Fri 14 Nov 10:00 — Sun 16 Nov 23:00"
 */
export function formatMultiDayLong(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt)
  const end = new Date(endsAt)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "Date TBA"
  return `${format(start, "EEE d MMM HH:mm")} — ${format(end, "EEE d MMM HH:mm")}`
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
