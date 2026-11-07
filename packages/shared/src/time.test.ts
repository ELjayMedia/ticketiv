import { describe, expect, it } from "vitest"

import { formatEventDate, formatTimeRange } from "./format"
import {
  DEFAULT_EVENT_TIME_ZONE,
  eventTimeZone,
  formatEventClock,
  parseEventLocalDateTime,
  toEventLocalInputValue,
  wallTimeToInstant,
  zonedDayKey,
  zonedParts,
} from "./time"

describe("event time zones", () => {
  it("falls back to Eswatini for missing or unknown zones", () => {
    expect(DEFAULT_EVENT_TIME_ZONE).toBe("Africa/Mbabane")
    expect(eventTimeZone(null, undefined, "Not/AZone")).toBe("Africa/Mbabane")
    expect(eventTimeZone(" Africa/Johannesburg ")).toBe("Africa/Johannesburg")
    expect(eventTimeZone(null, "Europe/London")).toBe("Europe/London")
  })

  it("formats in the event's zone, whatever the server runs in", () => {
    // 20:00Z is 22:00 in Eswatini
    expect(formatEventClock("2026-11-16T20:00:00Z")).toBe("22:00")
    expect(formatTimeRange("2026-11-16T17:00:00Z", "2026-11-16T21:00:00Z")).toBe("19:00 → 23:00")
    // 23:30Z on the 16th is already the 17th in Eswatini
    expect(formatEventDate("2026-11-16T23:30:00Z")).toBe("Tue 17 Nov")
    expect(formatEventDate("2026-11-16T23:30:00Z", null, "UTC")).toBe("Mon 16 Nov")
    expect(zonedDayKey("2026-11-16T23:30:00Z")).toBe("2026-11-17")
  })

  it("treats a multi-day range by the event's calendar days", () => {
    // 22:30Z on the 14th is 00:30 on the 15th in Eswatini: a two-day event
    expect(formatEventDate("2026-11-14T08:00:00Z", "2026-11-14T22:30:00Z")).toBe("Sat 14 → Sun 15 Nov")
    expect(formatEventDate("2026-11-14T08:00:00Z", "2026-11-14T20:00:00Z")).toBe("Sat 14 Nov")
  })

  it("reads typed wall-clock times in the event's zone", () => {
    expect(parseEventLocalDateTime("2026-11-16T19:00")?.toISOString()).toBe("2026-11-16T17:00:00.000Z")
    expect(parseEventLocalDateTime("2026-11-16T19:00", "Africa/Lagos")?.toISOString()).toBe("2026-11-16T18:00:00.000Z")
    // An explicit offset or Z is kept as given
    expect(parseEventLocalDateTime("2026-11-16T19:00:00Z")?.toISOString()).toBe("2026-11-16T19:00:00.000Z")
    expect(parseEventLocalDateTime("2026-13-01T19:00")).toBeNull()
    expect(toEventLocalInputValue("2026-11-16T17:00:00Z")).toBe("2026-11-16T19:00")
  })

  it("handles daylight saving zones", () => {
    // London: GMT in January, BST (UTC+1) in July
    expect(wallTimeToInstant({ year: 2026, month: 1, day: 10, hour: 19 }, "Europe/London").toISOString()).toBe("2026-01-10T19:00:00.000Z")
    expect(wallTimeToInstant({ year: 2026, month: 7, day: 10, hour: 19 }, "Europe/London").toISOString()).toBe("2026-07-10T18:00:00.000Z")
    expect(zonedParts("2026-07-10T18:00:00Z", "Europe/London").hour).toBe(19)
  })
})
