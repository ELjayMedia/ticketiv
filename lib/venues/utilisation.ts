export interface VenueUtilisation {
  from: string
  to: string
  days: number
  occupiedDays: number
  blockedDays: number
  occupancyPct: number
  bookings: number
  bookedHours: number
  events: number
  enquiriesReceived: number
  enquiriesAccepted: number
  wholeVenueBookings: number
  spaces: Array<{ spaceId: string; name: string; bookings: number; bookedHours: number }>
  months: Array<{ month: string; days: number; occupiedDays: number }>
}

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : 0)

/** Parse fn_venue_utilisation's jsonb. Null when it isn't the expected shape. */
export function parseUtilisation(raw: unknown): VenueUtilisation | null {
  if (!raw || typeof raw !== "object") return null
  const r = raw as Record<string, unknown>
  if (typeof r.days !== "number" || typeof r.from !== "string" || typeof r.to !== "string") return null
  const arr = (v: unknown) => (Array.isArray(v) ? (v as Array<Record<string, unknown>>) : [])
  return {
    from: r.from,
    to: r.to,
    days: r.days,
    occupiedDays: num(r.occupied_days),
    blockedDays: num(r.blocked_days),
    occupancyPct: num(r.occupancy_pct),
    bookings: num(r.bookings),
    bookedHours: num(r.booked_hours),
    events: num(r.events),
    enquiriesReceived: num(r.enquiries_received),
    enquiriesAccepted: num(r.enquiries_accepted),
    wholeVenueBookings: num(r.whole_venue_bookings),
    spaces: arr(r.spaces).map((s) => ({ spaceId: String(s.space_id ?? ""), name: String(s.name ?? ""), bookings: num(s.bookings), bookedHours: num(s.booked_hours) })),
    months: arr(r.months).map((m) => ({ month: String(m.month ?? ""), days: num(m.days), occupiedDays: num(m.occupied_days) })),
  }
}

/** "Dec 2026" from "2026-12". */
export function monthLabel(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month)
  if (!m) return month
  return new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)))
}

/** Share of enquiries accepted, as a whole percentage, or null with no enquiries. */
export function acceptanceRate(u: Pick<VenueUtilisation, "enquiriesReceived" | "enquiriesAccepted">): number | null {
  return u.enquiriesReceived > 0 ? Math.round((100 * u.enquiriesAccepted) / u.enquiriesReceived) : null
}

/** yyyy-mm-dd for a Date in Africa/Mbabane. */
export function venueLocalDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Mbabane", year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
