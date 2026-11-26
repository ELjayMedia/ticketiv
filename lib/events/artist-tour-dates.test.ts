import { describe, expect, it } from "vitest"

import { splitArtistTourDates, toArtistTourDate, type ArtistEventRow } from "@/lib/events/artist-tour-dates"

const NOW = Date.parse("2026-10-02T12:00:00Z")

function event(id: string, dates: Array<[string, string | null]>, extra: Partial<ArtistEventRow> = {}): ArtistEventRow {
  return {
    id, title: id, slug: id, status: "published",
    event_dates: dates.map(([starts_at, ends_at]) => ({ starts_at, ends_at })),
    ...extra,
  }
}

describe("artist tour dates", () => {
  it("splits upcoming from past and orders each side", () => {
    const dates = [
      toArtistTourDate(event("later", [["2026-11-10T18:00:00Z", "2026-11-10T22:00:00Z"]]), 2, NOW),
      toArtistTourDate(event("old", [["2026-08-01T18:00:00Z", "2026-08-01T22:00:00Z"]]), 2, NOW),
      toArtistTourDate(event("soon", [["2026-10-05T18:00:00Z", "2026-10-05T22:00:00Z"]]), 2, NOW),
      toArtistTourDate(event("older", [["2026-06-01T18:00:00Z", "2026-06-01T22:00:00Z"]]), 2, NOW),
    ]
    const { current, past } = splitArtistTourDates(dates)
    expect(current.map((d) => d.id)).toEqual(["soon", "later"])
    expect(past.map((d) => d.id)).toEqual(["old", "older"])
  })

  it("treats a cancelled_at marker as cancelled even for a future date", () => {
    const date = toArtistTourDate(event("off", [["2026-12-01T18:00:00Z", null]], { cancelled_at: "2026-09-30T10:00:00Z" }), 2, NOW)
    expect(date.lifecycle).toBe("cancelled")
    expect(splitArtistTourDates([date]).past).toHaveLength(1)
  })

  it("keeps a multi-date run current until its final occurrence ends, showing the next date", () => {
    const run = toArtistTourDate(
      event("run", [["2026-09-20T18:00:00Z", "2026-09-20T22:00:00Z"], ["2026-10-09T18:00:00Z", "2026-10-09T22:00:00Z"]]),
      1,
      NOW,
    )
    expect(run.lifecycle).not.toBe("ended")
    expect(run.starts_at).toBe("2026-10-09T18:00:00Z")
  })

  it("falls back to the event's own dates when it has no event_dates rows", () => {
    const date = toArtistTourDate(
      { id: "e", title: "e", slug: "e", status: "published", starts_at: "2026-10-20T18:00:00Z", ends_at: "2026-10-20T21:00:00Z", event_dates: [] },
      2,
      NOW,
    )
    expect(date.lifecycle).toBe("upcoming")
    expect(date.starts_at).toBe("2026-10-20T18:00:00Z")
  })
})

describe("tour date guide helpers", () => {
  it("formats dates in the venue's time zone", async () => {
    const { tourDateParts } = await import("@/lib/events/artist-tour-dates")
    // 23:30 UTC on 31 Dec is already 1 Jan in Mbabane (UTC+2).
    const p = tourDateParts("2026-12-31T23:30:00Z", "Africa/Mbabane")!
    expect(p).toMatchObject({ month: "JAN", day: "1", weekday: "Fri", time: "01:30", year: "2027", monthLabel: "January 2027" })
    expect(tourDateParts("not a date")).toBeNull()
  })

  it("groups by month in order and lists distinct cities", async () => {
    const { groupTourDatesByMonth, tourCities } = await import("@/lib/events/artist-tour-dates")
    const row = (id: string, starts_at: string, city?: string) =>
      ({ id, title: id, slug: id, starts_at, city, tz: "Africa/Mbabane", display_order: 2, lifecycle: "upcoming" as const })
    const dates = [row("a", "2026-12-05T18:00:00Z", "Mbabane"), row("b", "2026-12-20T18:00:00Z", "Manzini"), row("c", "2027-01-10T18:00:00Z", "Mbabane")]
    expect(groupTourDatesByMonth(dates).map((g) => [g.label, g.dates.map((d) => d.id)])).toEqual([
      ["December 2026", ["a", "b"]],
      ["January 2027", ["c"]],
    ])
    expect(tourCities(dates)).toEqual(["Mbabane", "Manzini"])
  })

  it("links artists by slug, falling back to id", async () => {
    const { artistHref, isArtistId } = await import("@/lib/events/artist-tour-dates")
    expect(artistHref({ id: "2c733740-4f8e-4106-b7ab-95de1d25f4b5", slug: "bethel" })).toBe("/artists/bethel")
    expect(artistHref({ id: "2c733740-4f8e-4106-b7ab-95de1d25f4b5", slug: null })).toBe("/artists/2c733740-4f8e-4106-b7ab-95de1d25f4b5")
    expect(isArtistId("2c733740-4f8e-4106-b7ab-95de1d25f4b5")).toBe(true)
    expect(isArtistId("bethel")).toBe(false)
  })

  it("carries venue slug, city and time zone through", () => {
    const d = toArtistTourDate(event("v", [["2026-12-01T18:00:00Z", null]], { venues: { name: "Theatre Club", slug: "theatre-club-mbabane", city: "Mbabane", tz: "Africa/Mbabane" } }), 1, NOW)
    expect(d).toMatchObject({ venue_name: "Theatre Club", venue_slug: "theatre-club-mbabane", city: "Mbabane", tz: "Africa/Mbabane" })
  })
})
