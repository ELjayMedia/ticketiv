// TICK-482 / TICK-460 — venue spaces, enquiries and bookings: shared rules
// and copy. The database is the authority; these mirror its checks so the UI
// never offers something the RPCs will refuse.

export const AMENITIES = {
  stage: "Stage",
  sound_system: "Sound system",
  lighting: "Lighting rig",
  projector: "Projector / screen",
  dressing_room: "Dressing room",
  bar: "Bar",
  kitchen: "Kitchen",
  catering: "In-house catering",
  parking: "Parking",
  security: "Security",
  generator: "Backup generator",
  wifi: "Wi-Fi",
  air_conditioning: "Air conditioning",
  outdoor_area: "Outdoor area",
  seating: "Seating provided",
  toilets: "Toilets",
} as const
export type AmenityKey = keyof typeof AMENITIES

export const ACCESSIBILITY = {
  step_free_entry: "Step-free entry",
  wheelchair_seating: "Wheelchair spaces",
  accessible_toilet: "Accessible toilet",
  lift: "Lift",
  hearing_loop: "Hearing loop",
  accessible_parking: "Accessible parking",
  quiet_room: "Quiet room",
  service_animals: "Service animals welcome",
} as const
export type AccessibilityKey = keyof typeof ACCESSIBILITY

export const VENUE_TYPES = {
  hall: "Hall",
  club: "Club",
  bar: "Bar or lounge",
  theatre: "Theatre",
  stadium: "Stadium or arena",
  outdoor: "Outdoor venue",
  conference: "Conference centre",
  church: "Church",
  restaurant: "Restaurant",
  hotel: "Hotel",
  other: "Other",
} as const
export type VenueTypeKey = keyof typeof VENUE_TYPES

export const RATE_UNITS = { hour: "per hour", day: "per day", event: "per event" } as const
export type RateUnit = keyof typeof RATE_UNITS

export function isVenueType(value: unknown): value is VenueTypeKey {
  return typeof value === "string" && value in VENUE_TYPES
}
export function isRateUnit(value: unknown): value is RateUnit {
  return typeof value === "string" && value in RATE_UNITS
}

/** Keep only known keys, de-duplicated, in a stable order. */
export function pickKeys<T extends Record<string, string>>(values: unknown[], allowed: T): Array<keyof T & string> {
  const set = new Set(values.map((v) => String(v)))
  return (Object.keys(allowed) as Array<keyof T & string>).filter((k) => set.has(k))
}

export function formatMoney(cents: number, currency: string): string {
  const amount = cents / 100
  return `${currency} ${amount.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** "SZL 15,000 per day", or null when no rate is published. */
export function formatRate(cents: number | null, currency: string | null, unit: string | null): string | null {
  if (cents === null || cents === undefined || !isRateUnit(unit)) return null
  return `${formatMoney(cents, currency || "SZL")} ${RATE_UNITS[unit]}`
}

/** "Standing 800 · seated 400" */
export function formatSpaceCapacity(standing: number | null, seated: number | null): string | null {
  const parts = [standing ? `standing ${standing.toLocaleString("en-GB")}` : null, seated ? `seated ${seated.toLocaleString("en-GB")}` : null].filter(Boolean)
  if (parts.length === 0) return null
  const text = parts.join(" · ")
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * Venues in Eswatini run on Africa/Mbabane (UTC+2, no daylight saving). Form
 * dates and times are read as local time there.
 */
export const VENUE_UTC_OFFSET = "+02:00"

/** "2026-12-24" + "18:30" → ISO instant, or null when either is malformed. */
export function localDateTimeToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const d = new Date(`${date}T${time}:00${VENUE_UTC_OFFSET}`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

/** End on the same day, or the next day when it is earlier than the start (an overnight event). */
export function rangeFromForm(date: string, startTime: string, endTime: string): { startsAt: string; endsAt: string } | null {
  const startsAt = localDateTimeToIso(date, startTime)
  let endsAt = localDateTimeToIso(date, endTime)
  if (!startsAt || !endsAt) return null
  if (new Date(endsAt) <= new Date(startsAt)) endsAt = new Date(new Date(endsAt).getTime() + 24 * 3600 * 1000).toISOString()
  return { startsAt, endsAt }
}

export function formatVenueRange(startsAt: string, endsAt: string): string {
  const tz = "Africa/Mbabane"
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: tz })
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz })
  const s = new Date(startsAt)
  const e = new Date(endsAt)
  const sameDay = day.format(s) === day.format(e)
  return sameDay ? `${day.format(s)}, ${time.format(s)}–${time.format(e)}` : `${day.format(s)} ${time.format(s)} – ${day.format(e)} ${time.format(e)}`
}

export type EnquiryStatus = "open" | "accepted" | "declined" | "withdrawn"
export function enquiryStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Waiting for the venue"
    case "accepted":
      return "Accepted"
    case "declined":
      return "Declined"
    case "withdrawn":
      return "Withdrawn"
    default:
      return status
  }
}

/** The conflict DETAIL fn_decide_venue_enquiry gives with slot_unavailable. */
export function slotConflictMessage(detail: string | null | undefined): string {
  switch ((detail ?? "").trim()) {
    case "booking":
      return "That time is already booked. Decline, or suggest another date in the thread."
    case "blocked":
      return "You've blocked that time on the calendar. Remove the block first, or suggest another date."
    case "event":
      return "An event is already on at the venue then. Suggest another date in the thread."
    default:
      return "That time is no longer free."
  }
}

export const MARKETPLACE_ERROR_COPY: Record<string, string> = {
  amenity_invalid: "Choose amenities from the list.",
  accessibility_invalid: "Choose accessibility features from the list.",
  image_invalid: "Use up to 8 image links, each starting with https://.",
  rate_unit_required: "Say whether the rate is per hour, day or event.",
  too_many_spaces: "A venue can list up to 50 spaces.",
  space_not_found: "That space no longer exists.",
  space_has_bookings: "This space has upcoming bookings. Cancel them before deleting it.",
  dates_invalid: "Check the date and times. Enquiries must be in the future and last at most 14 days.",
  slot_booked: "That time is already booked, so it can't be blocked.",
  venue_not_listed: "This venue isn't taking enquiries on Ticketiv yet.",
  message_required: "Write a short message (at least 10 characters) about your event.",
  enquiry_rate_limited: "You've sent a lot of enquiries today. Try again tomorrow.",
  enquiry_not_open: "This enquiry has already been answered or withdrawn.",
  enquiry_closed: "This enquiry is closed.",
  booking_not_confirmed: "This booking was already cancelled.",
  reason_required: "Give a short reason for cancelling.",
  venue_type_invalid: "Choose a venue type from the list.",
}

/** Split bookings into upcoming (soonest first), past and cancelled (most recent first). */
export function groupVenueBookings<T extends { status: string; endsAt: string }>(rows: T[], nowMs: number = Date.now()) {
  const confirmed = rows.filter((b) => b.status === "confirmed")
  return {
    upcoming: confirmed.filter((b) => new Date(b.endsAt).getTime() >= nowMs),
    past: confirmed.filter((b) => new Date(b.endsAt).getTime() < nowMs).reverse(),
    cancelled: rows.filter((b) => b.status === "cancelled").reverse(),
  }
}
