// Turn the organiser's Attendee guide form into the jsonb fn_save_event_guide
// takes. Pure, so it is unit tested.

const TZ_OFFSET = "+02:00" // Eswatini (Africa/Mbabane): UTC+2, no daylight saving.

/** The event's calendar day where it happens, YYYY-MM-DD. */
export function eventLocalDate(startsAt: string | null | undefined, timeZone = "Africa/Mbabane"): string | null {
  if (!startsAt) return null
  const date = new Date(startsAt)
  if (!Number.isFinite(date.getTime())) return null
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date)
}

/** "HH:MM" of an instant where the event happens. */
export function localTime(iso: string | null | undefined, timeZone = "Africa/Mbabane"): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (!Number.isFinite(date.getTime())) return ""
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date)
}

const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/

function text(form: FormData, key: string, max = 600): string {
  return String(form.get(key) ?? "").trim().slice(0, max)
}

export interface GuideFormResult {
  guide: Record<string, unknown>
  errors: string[]
}

export function guideFromForm(form: FormData, eventStartsAt: string | null | undefined): GuideFormResult {
  const errors: string[] = []

  const doors = text(form, "doors", 5)
  let doorsOpenAt: string | null = null
  if (doors) {
    const day = eventLocalDate(eventStartsAt)
    if (!TIME.test(doors)) errors.push("Doors time must look like 14:00.")
    else if (!day) errors.push("Set the event date before the doors time.")
    else doorsOpenAt = `${day}T${doors.padStart(5, "0")}:00${TZ_OFFSET}`
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
