import type { RecurrencePattern, RecurrenceWeekDay } from "./recurrence"

// JS Date.getDay(): 0 = Sunday … 6 = Saturday
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

function atTime(date: Date, time?: string): Date {
  const { hours, minutes } = parseTime(time)
  const d = new Date(date)
  d.setHours(hours, minutes, 0, 0)
  return d
}

/**
 * Compute the next `count` occurrence dates for a recurrence pattern,
 * starting strictly after `anchor`.
 *
 * This is a pure date utility — it does NOT create event rows.
 */
export function computeOccurrences(
  pattern: RecurrencePattern,
  anchor: Date,
  count: number,
): Date[] {
  const results: Date[] = []
  const safeCount = Math.max(0, Math.min(count, 52))
  if (safeCount === 0) return results

  if (pattern.freq === "daily") {
    let cursor = atTime(anchor, pattern.time)
    while (results.length < safeCount) {
      cursor = new Date(cursor)
      cursor.setDate(cursor.getDate() + 1)
      results.push(new Date(cursor))
    }
    return results
  }

  if (pattern.freq === "weekly") {
    const days = [...new Set(pattern.byday)]
      .map((d) => WEEKDAY_INDEX[d])
      .filter((n) => n != null)
      .sort((a, b) => a - b)
    if (days.length === 0) return results

    const cursor = new Date(anchor)
    cursor.setHours(0, 0, 0, 0)
    let guard = 0
    while (results.length < safeCount && guard < 366 * 2) {
      cursor.setDate(cursor.getDate() + 1)
      guard += 1
      if (days.includes(cursor.getDay())) {
        const occ = atTime(cursor, pattern.time)
        if (occ.getTime() > anchor.getTime()) results.push(occ)
      }
    }
    return results
  }

  if (pattern.freq === "monthly") {
    const targetDay = pattern.bymonthday && pattern.bymonthday >= 1 ? pattern.bymonthday : 1
    let year = anchor.getFullYear()
    let month = anchor.getMonth()
    let guard = 0
    while (results.length < safeCount && guard < 60) {
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const day = Math.min(targetDay, daysInMonth)
      const occ = atTime(new Date(year, month, day), pattern.time)
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
