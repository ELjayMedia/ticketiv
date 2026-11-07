import { DEFAULT_EVENT_TIME_ZONE, eventTimeZone, wallTimeToInstant, zonedParts } from "@ticketiv/shared"

import type { RecurrencePattern, RecurrenceWeekDay } from "./recurrence"

// Weekday index: 0 = Sunday … 6 = Saturday
const WEEKDAY_INDEX: Record<RecurrenceWeekDay, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

function parseTime(time?: string): { hours: number; minutes: number } {
  if (!time) return { hours: 20, minutes: 0 }
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return { hours: 20, minutes: 0 }
  return { hours: Math.min(23, parseInt(m[1], 10)), minutes: Math.min(59, parseInt(m[2], 10)) }
}

/**
 * Occurrences are wall-clock times where the event happens ("every Friday at
 * 20:00" in Eswatini), so days are counted in the event's zone and each one
 * is converted to a real instant there — never on the server's clock.
 */
type WallDay = { year: number; month: number; day: number }

function wallDayOf(instant: Date, timeZone: string): WallDay {
  const p = zonedParts(instant, timeZone)
  return { year: p.year, month: p.month, day: p.day }
}

/** Shift a wall day by n days (calendar arithmetic, zone independent). */
function addDays(d: WallDay, n: number): WallDay {
  const t = new Date(Date.UTC(d.year, d.month - 1, d.day + n))
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() }
}

function weekdayOf(d: WallDay): number {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay()
}

function atTime(d: WallDay, time: string | undefined, timeZone: string): Date {
  const { hours, minutes } = parseTime(time)
  return wallTimeToInstant({ ...d, hour: hours, minute: minutes }, timeZone)
}

/**
 * Compute the next `count` occurrence dates for a recurrence pattern,
 * starting strictly after `anchor`, at the pattern's time in `timeZone`.
 *
 * This is a pure date utility — it does NOT create event rows.
 */
export function computeOccurrences(
  pattern: RecurrencePattern,
  anchor: Date,
  count: number,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): Date[] {
  const zone = eventTimeZone(timeZone)
  const results: Date[] = []
  const safeCount = Math.max(0, Math.min(count, 52))
  if (safeCount === 0) return results
  const anchorDay = wallDayOf(anchor, zone)

  if (pattern.freq === "daily") {
    let cursor = anchorDay
    while (results.length < safeCount) {
      cursor = addDays(cursor, 1)
      results.push(atTime(cursor, pattern.time, zone))
    }
    return results
  }

  if (pattern.freq === "weekly") {
    const days = [...new Set(pattern.byday)]
      .map((d) => WEEKDAY_INDEX[d])
      .filter((n) => n != null)
      .sort((a, b) => a - b)
    if (days.length === 0) return results

    let cursor = anchorDay
    let guard = 0
    while (results.length < safeCount && guard < 366 * 2) {
      cursor = addDays(cursor, 1)
      guard += 1
      if (days.includes(weekdayOf(cursor))) {
        const occ = atTime(cursor, pattern.time, zone)
        if (occ.getTime() > anchor.getTime()) results.push(occ)
      }
    }
    return results
  }

  if (pattern.freq === "monthly") {
    const targetDay = pattern.bymonthday && pattern.bymonthday >= 1 ? pattern.bymonthday : 1
    let year = anchorDay.year
    let month = anchorDay.month - 1
    let guard = 0
    while (results.length < safeCount && guard < 60) {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
      const day = Math.min(targetDay, daysInMonth)
      const occ = atTime({ year, month: month + 1, day }, pattern.time, zone)
      if (occ.getTime() > anchor.getTime()) results.push(occ)
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
      guard += 1
    }
    return results
  }

  return results
}
