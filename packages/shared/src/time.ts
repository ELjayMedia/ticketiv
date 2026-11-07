/**
 * Event time zones.
 *
 * Event times are shown, and typed in, in the zone where the event happens
 * (events.tz, else the venue's tz), never the server's or the viewer's
 * device zone. Servers run in UTC, so anything formatted without an explicit
 * zone was two hours early for Eswatini. Ticketiv's default market is
 * Eswatini (UTC+2, no daylight saving).
 */

export const DEFAULT_EVENT_TIME_ZONE = "Africa/Mbabane"

const validity = new Map<string, boolean>()

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false
  const zone = value.trim()
  const known = validity.get(zone)
  if (known !== undefined) return known
  let ok = false
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone }).format(0)
    ok = true
  } catch {
    ok = false
  }
  validity.set(zone, ok)
  return ok
}

/** The first valid zone among the candidates (event, venue…), else Eswatini. */
export function eventTimeZone(...candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) if (isValidTimeZone(candidate)) return candidate.trim()
  return DEFAULT_EVENT_TIME_ZONE
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value)
}

export interface ZonedParts {
  year: number
  month: number // 1-12
  day: number
  hour: number
  minute: number
  second: number
  weekday: number // 0 = Sunday … 6 = Saturday
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

/** Wall-clock parts of an instant in a zone. */
export function zonedParts(value: Date | string | number, timeZone: string = DEFAULT_EVENT_TIME_ZONE): ZonedParts {
  const zone = eventTimeZone(timeZone)
  let fmt = partsFormatters.get(zone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    })
    partsFormatters.set(zone, fmt)
  }
  const out: Record<string, string> = {}
  for (const part of fmt.formatToParts(toDate(value))) out[part.type] = part.value
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday),
  }
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0")

/** Calendar day of an instant in a zone, YYYY-MM-DD. */
export function zonedDayKey(value: Date | string | number, timeZone: string = DEFAULT_EVENT_TIME_ZONE): string {
  const p = zonedParts(value, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** Offset of the zone from UTC at an instant, in milliseconds (Eswatini: +2h). */
export function zoneOffsetMs(instant: number, timeZone: string = DEFAULT_EVENT_TIME_ZONE): number {
  const p = zonedParts(instant, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant / 1000) * 1000
}

/**
 * The instant at which the clock on the wall in `timeZone` reads the given
 * date and time. Handles daylight-saving zones by re-checking the offset.
 */
export function wallTimeToInstant(
  wall: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
): Date {
  const guess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour ?? 0, wall.minute ?? 0, wall.second ?? 0)
  let instant = guess - zoneOffsetMs(guess, timeZone)
  const corrected = guess - zoneOffsetMs(instant, timeZone)
  if (corrected !== instant) instant = corrected
  return new Date(instant)
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/

/**
 * Read a date-time typed for the event ("2026-11-16T19:00", as a
 * datetime-local input gives it) as wall-clock time in the event's zone.
 * Strings that already carry an offset or "Z" are taken as they are.
 */
export function parseEventLocalDateTime(value: string, timeZone: string = DEFAULT_EVENT_TIME_ZONE): Date | null {
  const text = value.trim()
  if (!text) return null
  const m = LOCAL_INPUT.exec(text)
  if (!m) {
    const parsed = new Date(text)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  const [, y, mo, d, h = "0", mi = "0", s = "0"] = m
  const wall = { year: Number(y), month: Number(mo), day: Number(d), hour: Number(h), minute: Number(mi), second: Number(s) }
  if (wall.month < 1 || wall.month > 12 || wall.day < 1 || wall.day > 31 || wall.hour > 23 || wall.minute > 59) return null
  return wallTimeToInstant(wall, timeZone)
}

/** "2026-11-16T19:00" for a datetime-local input, in the event's zone. */
export function toEventLocalInputValue(value: string | null | undefined, timeZone: string = DEFAULT_EVENT_TIME_ZONE): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  const p = zonedParts(date, timeZone)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`
}

/** Intl formatting pinned to the event's zone (default Eswatini). */
export function formatInTimeZone(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions,
  timeZone: string = DEFAULT_EVENT_TIME_ZONE,
  locale = "en-GB",
): string {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: eventTimeZone(timeZone) }).format(date)
}

/** "19:00" in the event's zone. */
export function formatEventClock(value: Date | string | number, timeZone: string = DEFAULT_EVENT_TIME_ZONE): string {
  return formatInTimeZone(value, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }, timeZone)
}
