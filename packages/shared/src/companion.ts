/**
 * Event Companion stages.
 *
 * One event screen changes with the attendee's journey:
 *   booked → today → in → after
 *
 * - booked: they hold a ticket and the event is more than LEAD_HOURS away.
 * - today:  the event starts within LEAD_HOURS, or has started, and they are
 *           not scanned in yet. The QR comes first.
 * - in:     the server has recorded their scan. Only an authoritative
 *           checked_in_at moves a ticket here, never a local guess.
 * - after:  the event ended (end + grace, same grace as My tickets' Past).
 *
 * Pure and platform-neutral so web and the React Native apps agree.
 */

export type CompanionStage = "booked" | "today" | "in" | "after"

export const COMPANION_LEAD_HOURS = 12
export const COMPANION_END_GRACE_MS = 3 * 60 * 60 * 1000

const HOUR = 60 * 60 * 1000

function ms(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : null
}

export function companionStage(input: {
  startsAt: string | null | undefined
  endsAt?: string | null
  checkedInAt?: string | null
  nowMs?: number
}): CompanionStage {
  const now = input.nowMs ?? Date.now()
  const start = ms(input.startsAt)
  const end = ms(input.endsAt) ?? start

  if (end !== null && now > end + COMPANION_END_GRACE_MS) return "after"
  if (ms(input.checkedInAt) !== null) return "in"
  if (start === null) return "booked"
  return start - now <= COMPANION_LEAD_HOURS * HOUR ? "today" : "booked"
}

/** Calendar day (YYYY-MM-DD) of an instant in a time zone. */
function dayKey(instant: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant))
}

/**
 * "TODAY", "TOMORROW", "IN 9 DAYS", counted in calendar days where the event
 * happens (Eswatini by default), so 23:00 tonight never reads "tomorrow".
 */
export function companionCountdown(startsAt: string | null | undefined, nowMs = Date.now(), timeZone = "Africa/Mbabane"): string | null {
  const start = ms(startsAt)
  if (start === null) return null
  const days = Math.round((Date.parse(dayKey(start, timeZone)) - Date.parse(dayKey(nowMs, timeZone))) / (24 * HOUR))
  if (days <= 0) return "TODAY"
  if (days === 1) return "TOMORROW"
  return `IN ${days} DAYS`
}

/** A running-order line as organisers enter it. */
export interface GuideProgrammeItem {
  time: string
  title: string
  where?: string | null
}

/** A venue fact ("Toilets: behind the VIP deck"). */
export interface GuideFacility {
  label: string
  detail: string
}

/**
 * Which running-order item is on now, given "HH:MM" times on the event day.
 * Returns the index of the last item that has started, or -1 before the first.
 */
export function currentProgrammeIndex(items: GuideProgrammeItem[], nowMs: number, eventDayStartsAt: string | null | undefined, timeZone = "Africa/Mbabane"): number {
  const start = ms(eventDayStartsAt)
  if (start === null || items.length === 0) return -1
  const local = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
  const sameDay = dayKey(start, timeZone) === dayKey(nowMs, timeZone)
  if (!sameDay) return -1
  const [h, m] = local.format(new Date(nowMs)).split(":").map(Number)
  const nowMinutes = h * 60 + m
  let current = -1
  items.forEach((item, index) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(item.time.trim())
    if (!match) return
    if (Number(match[1]) * 60 + Number(match[2]) <= nowMinutes) current = index
  })
  return current
}

/** Keep only well-formed running-order rows, in time order. */
export function cleanProgramme(raw: unknown): GuideProgrammeItem[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>) : {}))
    .map((row) => ({
      time: typeof row.time === "string" ? row.time.trim() : "",
      title: typeof row.title === "string" ? row.title.trim() : "",
      where: typeof row.where === "string" && row.where.trim() ? row.where.trim() : null,
    }))
    .filter((row) => /^\d{1,2}:\d{2}$/.test(row.time) && row.title.length > 0)
    .sort((a, b) => a.time.padStart(5, "0").localeCompare(b.time.padStart(5, "0")))
}

export function cleanFacilities(raw: unknown): GuideFacility[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((row) => (row && typeof row === "object" ? (row as Record<string, unknown>) : {}))
    .map((row) => ({
      label: typeof row.label === "string" ? row.label.trim() : "",
      detail: typeof row.detail === "string" ? row.detail.trim() : "",
    }))
    .filter((row) => row.label.length > 0 && row.detail.length > 0)
}

function icsStamp(instant: number): string {
  return new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

/**
 * A calendar file for an event, with real start and end times (UTC). With no
 * end, the event is booked for three hours.
 */
export function buildEventIcs(input: {
  uid: string
  title: string
  startsAt: string | null | undefined
  endsAt?: string | null
  location?: string | null
  description?: string | null
  url?: string | null
  nowMs?: number
}): string | null {
  const start = ms(input.startsAt)
  if (start === null) return null
  const end = ms(input.endsAt) ?? start + 3 * HOUR
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ticketiv//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}@ticketiv`,
    `DTSTAMP:${icsStamp(input.nowMs ?? Date.now())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(Math.max(end, start))}`,
    `SUMMARY:${icsText(input.title)}`,
  ]
  if (input.location) lines.push(`LOCATION:${icsText(input.location)}`)
  if (input.description) lines.push(`DESCRIPTION:${icsText(input.description)}`)
  if (input.url) lines.push(`URL:${input.url}`)
  lines.push("END:VEVENT", "END:VCALENDAR")
  return lines.join("\r\n")
}
