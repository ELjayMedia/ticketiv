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
