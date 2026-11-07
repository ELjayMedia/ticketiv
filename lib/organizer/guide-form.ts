// Turn the organiser's Attendee guide form into the jsonb fn_save_event_guide
// takes. Pure, so it is unit tested.

import { DEFAULT_EVENT_TIME_ZONE, formatEventClock, wallTimeToInstant, zonedDayKey } from "@ticketiv/shared"

/** The event's calendar day where it happens, YYYY-MM-DD. */
export function eventLocalDate(startsAt: string | null | undefined, timeZone: string = DEFAULT_EVENT_TIME_ZONE): string | null {
  if (!startsAt) return null
  const date = new Date(startsAt)
  if (!Number.isFinite(date.getTime())) return null
  return zonedDayKey(date, timeZone)
}

/** "HH:MM" of an instant where the event happens. */
export function localTime(iso: string | null | undefined, timeZone: string = DEFAULT_EVENT_TIME_ZONE): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  return formatEventClock(date, timeZone)
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/

function text(form: FormData, key: string, max = 600): string {
  return String(form.get(key) ?? "").trim().slice(0, max)
}

export interface GuideFormResult {
  guide: Record<string, unknown>
  errors: string[]
}

export function guideFromForm(form: FormData, eventStartsAt: string | null | undefined, timeZone: string = DEFAULT_EVENT_TIME_ZONE): GuideFormResult {
  const errors: string[] = []

  const doors = text(form, "doors", 5)
  let doorsOpenAt: string | null = null
  if (doors) {
    const day = eventLocalDate(eventStartsAt, timeZone)
    if (!TIME.test(doors)) errors.push("Doors time must look like 14:00.")
    else if (!day) errors.push("Set the event date before the doors time.")
    else {
      // Doors on the event's day, as the clock reads where the event happens.
      const [y, mo, d] = day.split("-").map(Number)
      const [h, mi] = doors.split(":").map(Number)
      doorsOpenAt = wallTimeToInstant({ year: y, month: mo, day: d, hour: h, minute: mi }, timeZone).toISOString()
    }
  }

  const times = form.getAll("programme_time").map((v) => String(v).trim())
  const titles = form.getAll("programme_title").map((v) => String(v).trim())
  const wheres = form.getAll("programme_where").map((v) => String(v).trim())
  const programme: Array<{ time: string; title: string; where: string | null }> = []
  times.forEach((time, i) => {
    const title = (titles[i] ?? "").slice(0, 120)
    if (!time && !title) return
    if (!TIME.test(time)) {
      errors.push(`Running order line ${i + 1}: the time must look like 19:00.`)
      return
    }
    if (!title) {
      errors.push(`Running order line ${i + 1}: say what happens at ${time}.`)
      return
    }
    programme.push({ time: time.padStart(5, "0"), title, where: (wheres[i] ?? "").slice(0, 80) || null })
  })
  programme.sort((a, b) => a.time.localeCompare(b.time))
  if (programme.length > 30) errors.push("Keep the running order to 30 lines.")

  const labels = form.getAll("facility_label").map((v) => String(v).trim())
  const details = form.getAll("facility_detail").map((v) => String(v).trim())
  const facilities: Array<{ label: string; detail: string }> = []
  labels.forEach((label, i) => {
    const detail = (details[i] ?? "").slice(0, 120)
    if (!label && !detail) return
    if (!label || !detail) {
      errors.push(`Venue info line ${i + 1}: fill in both the name and where it is.`)
      return
    }
    facilities.push({ label: label.slice(0, 40), detail })
  })
  if (facilities.length > 12) errors.push("Keep venue info to 12 lines.")

  return {
    errors,
    guide: {
      doors_open_at: doorsOpenAt,
      entrance: text(form, "entrance"),
      getting_there: text(form, "getting_there"),
      parking: text(form, "parking"),
      age_rule: text(form, "age_rule"),
      payment_note: text(form, "payment_note"),
      what_to_bring: text(form, "what_to_bring"),
      house_rules: text(form, "house_rules"),
      help_contact: text(form, "help_contact"),
      programme,
      facilities,
    },
  }
}
