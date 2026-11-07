import { describe, expect, it } from "vitest"

import { buildEventIcs, cleanFacilities, cleanProgramme, companionCountdown, companionStage, currentProgrammeIndex } from "./companion"

// Sat 16 Nov 2026, 14:00 in Eswatini (UTC+2) = 12:00Z
const START = "2026-11-16T12:00:00Z"
const END = "2026-11-16T21:00:00Z"
const at = (iso: string) => Date.parse(iso)

describe("companionStage", () => {
  it("is booked until 12 hours before the start", () => {
    expect(companionStage({ startsAt: START, endsAt: END, nowMs: at("2026-11-07T10:00:00Z") })).toBe("booked")
    expect(companionStage({ startsAt: START, endsAt: END, nowMs: at("2026-11-15T23:59:00Z") })).toBe("booked")
  })

  it("is today from 12 hours before, and while the event runs", () => {
    expect(companionStage({ startsAt: START, endsAt: END, nowMs: at("2026-11-16T00:00:00Z") })).toBe("today")
    expect(companionStage({ startsAt: START, endsAt: END, nowMs: at("2026-11-16T15:00:00Z") })).toBe("today")
  })

  it("moves to in only once the scan is recorded", () => {
    expect(companionStage({ startsAt: START, endsAt: END, checkedInAt: "2026-11-16T12:32:00Z", nowMs: at("2026-11-16T13:00:00Z") })).toBe("in")
  })

  it("keeps the companion open after scan-in until the event ends plus grace", () => {
    expect(companionStage({ startsAt: START, endsAt: END, checkedInAt: "2026-11-16T12:32:00Z", nowMs: at("2026-11-16T23:30:00Z") })).toBe("in")
    expect(companionStage({ startsAt: START, endsAt: END, checkedInAt: "2026-11-16T12:32:00Z", nowMs: at("2026-11-17T00:30:00Z") })).toBe("after")
    expect(companionStage({ startsAt: START, endsAt: END, nowMs: at("2026-11-17T00:30:00Z") })).toBe("after")
  })

  it("uses the start as the end when no end is known, and stays booked with no date", () => {
    expect(companionStage({ startsAt: START, nowMs: at("2026-11-16T15:30:00Z") })).toBe("after")
    expect(companionStage({ startsAt: null, nowMs: at("2026-11-16T15:30:00Z") })).toBe("booked")
  })
})

describe("companionCountdown", () => {
  it("counts calendar days where the event happens", () => {
    expect(companionCountdown(START, at("2026-11-07T10:00:00Z"))).toBe("IN 9 DAYS")
    expect(companionCountdown(START, at("2026-11-15T21:30:00Z"))).toBe("TOMORROW") // 23:30 local on the 15th
    expect(companionCountdown(START, at("2026-11-15T22:30:00Z"))).toBe("TODAY") // 00:30 local on the 16th
    expect(companionCountdown(null)).toBeNull()
  })
})

describe("programme", () => {
  const items = cleanProgramme([
    { time: "17:00", title: "The Lowveld Collective" },
    { time: "13:30", title: "Gates open", where: "Main entrance" },
    { time: "15:00", title: "DJ Nala", where: "Main stage" },
    { time: "bad", title: "Dropped" },
    { time: "19:00", title: "" },
  ])

  it("keeps valid rows in time order", () => {
    expect(items.map((i) => i.time)).toEqual(["13:30", "15:00", "17:00"])
    expect(items[0].where).toBe("Main entrance")
    expect(items[2].where).toBeNull()
  })

  it("finds what is on now on the event day", () => {
    expect(currentProgrammeIndex(items, at("2026-11-16T13:10:00Z"), START)).toBe(1) // 15:10 local
    expect(currentProgrammeIndex(items, at("2026-11-16T11:00:00Z"), START)).toBe(-1) // 13:00 local
    expect(currentProgrammeIndex(items, at("2026-11-15T13:10:00Z"), START)).toBe(-1) // a day early
  })

  it("drops incomplete venue facts", () => {
    expect(cleanFacilities([{ label: "Toilets", detail: "Behind the VIP deck" }, { label: "First aid" }, null])).toEqual([
      { label: "Toilets", detail: "Behind the VIP deck" },
    ])
  })
})

describe("buildEventIcs", () => {
  it("writes real start and end times", () => {
    const ics = buildEventIcs({ uid: "e1", title: "Sunset Sessions, live", startsAt: START, endsAt: END, location: "Valley Amphitheatre", nowMs: at("2026-11-07T10:00:00Z") })!
    expect(ics).toContain("DTSTART:20261116T120000Z")
    expect(ics).toContain("DTEND:20261116T210000Z")
    expect(ics).toContain("SUMMARY:Sunset Sessions\\, live")
    expect(ics.split("\r\n")[0]).toBe("BEGIN:VCALENDAR")
  })

  it("books three hours when there is no end, and nothing without a start", () => {
    expect(buildEventIcs({ uid: "e1", title: "x", startsAt: START })).toContain("DTEND:20261116T150000Z")
    expect(buildEventIcs({ uid: "e1", title: "x", startsAt: null })).toBeNull()
  })
})
