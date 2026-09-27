import { describe, expect, it } from "vitest"

import { partitionSeriesEvents } from "@/lib/series/event-lifecycle"

const NOW = new Date("2026-09-27T10:00:00.000Z").getTime()

describe("partitionSeriesEvents", () => {
  it("keeps a multi-date event current until the final occurrence ends plus grace", () => {
    const event = {
      id: "multi",
      starts_at: "2026-09-20T10:00:00.000Z",
      ends_at: "2026-09-20T12:00:00.000Z",
      lifecycle_end_at: "2026-09-28T20:00:00.000Z",
      status: "published",
    }

    const result = partitionSeriesEvents([event], NOW)
    expect(result.upcoming.map((item) => item.id)).toEqual(["multi"])
    expect(result.past).toEqual([])
  })

  it("moves ended and cancelled events into history", () => {
    const events = [
      {
        id: "ended",
        starts_at: "2026-09-20T10:00:00.000Z",
        lifecycle_end_at: "2026-09-20T12:00:00.000Z",
        status: "published",
      },
      {
        id: "cancelled",
        starts_at: "2026-09-29T10:00:00.000Z",
        lifecycle_end_at: "2026-09-29T12:00:00.000Z",
        status: "cancelled",
      },
    ]

    const result = partitionSeriesEvents(events, NOW)
    expect(result.upcoming).toEqual([])
    expect(new Set(result.past.map((item) => item.id))).toEqual(
      new Set(["ended", "cancelled"]),
    )
  })
})
