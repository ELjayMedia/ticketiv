export type RecurrenceWeekDay = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU"

export type RecurrencePattern =
  | { freq: "weekly"; byday: RecurrenceWeekDay[]; time?: string }
  | { freq: "monthly"; bymonthday?: number; byday?: RecurrenceWeekDay; time?: string }
  | { freq: "daily"; time?: string }

const DAY_NAMES: Record<RecurrenceWeekDay, string> = {
  MO: "Monday",
  TU: "Tuesday",
  WE: "Wednesday",
  TH: "Thursday",
  FR: "Friday",
  SA: "Saturday",
  SU: "Sunday",
}

function formatList(parts: string[]): string {
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`
}

function formatTime(time?: string): string {
  if (!time) return ""
  const m = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!m) return ""
  const hour24 = parseInt(m[1], 10)
  const minute = m[2]
  const period = hour24 >= 12 ? "PM" : "AM"
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  if (minute === "00") return ` at ${hour12}:${minute} ${period}`
  return ` at ${hour12}:${minute} ${period}`
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function describeRecurrence(pattern: unknown): string | null {
  if (!pattern || typeof pattern !== "object") return null
  const p = pattern as Partial<RecurrencePattern> & { freq?: string }

  if (p.freq === "weekly") {
    const days = (p as { byday?: RecurrenceWeekDay[] }).byday ?? []
    if (days.length === 0) return null
    const names = days.map((d) => DAY_NAMES[d]).filter(Boolean)
    return `Every ${formatList(names)}${formatTime((p as { time?: string }).time)}`
  }

  if (p.freq === "monthly") {
    const day = (p as { bymonthday?: number }).bymonthday
    if (typeof day === "number" && day >= 1 && day <= 31) {
      return `On the ${ordinal(day)} of every month${formatTime((p as { time?: string }).time)}`
    }
    const byday = (p as { byday?: RecurrenceWeekDay }).byday
    if (byday && DAY_NAMES[byday]) {
      return `Monthly on ${DAY_NAMES[byday]}${formatTime((p as { time?: string }).time)}`
    }
    return `Every month${formatTime((p as { time?: string }).time)}`
  }

  if (p.freq === "daily") {
    return `Every day${formatTime((p as { time?: string }).time)}`
  }

  return null
}
