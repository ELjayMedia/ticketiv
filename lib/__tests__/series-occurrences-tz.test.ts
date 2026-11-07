import { describe, expect, it } from "vitest"

import { resolveWhenPreset } from "@/lib/data/public/search"
import { computeOccurrences } from "@/lib/series/occurrences"

describe("series occurrences in the event's zone", () => {
  it("puts weekly 20:00 events at 20:00 Eswatini time (18:00Z)", () => {
    const anchor = new Date("2026-11-02T10:00:00Z") // Mon 2 Nov
    const dates = computeOccurrences({ freq: "weekly", byday: ["FR"], time: "20:00" } as never, anchor, 2)
    expect(dates.map((d) => d.toISOString())).toEqual(["2026-11-06T18:00:00.000Z", "2026-11-13T18:00:00.000Z"])
  })

  it("counts days where the event happens, not in UTC", () => {
    // 23:30Z Sunday is already 01:30 Monday in Eswatini: next daily is Tuesday
    const dates = computeOccurrences({ freq: "daily", time: "09:00" } as never, new Date("2026-11-08T23:30:00Z"), 1)
    expect(dates[0].toISOString()).toBe("2026-11-10T07:00:00.000Z")
  })

  it("uses another zone when the event has one", () => {
    const dates = computeOccurrences({ freq: "monthly", bymonthday: 5, time: "19:30" } as never, new Date("2026-11-01T00:00:00Z"), 1, "Africa/Lagos")
    expect(dates[0].toISOString()).toBe("2026-11-05T18:30:00.000Z")
  })
})

describe("search 'this weekend' in Eswatini", () => {
  it("runs Saturday 00:00 to Sunday 23:59 local", () => {
    // Thursday 12 Nov, 23:00Z (= Fri 01:00 in Eswatini)
    const { startsAfter, startsBefore } = resolveWhenPreset("weekend", new Date("2026-11-12T23:00:00Z"))
    expect(startsAfter).toBe("2026-11-13T22:00:00.000Z") // Sat 14 00:00 local
    expect(startsBefore).toBe("2026-11-15T21:59:59.999Z") // Sun 15 23:59:59 local
  })
})
