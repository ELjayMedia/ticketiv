import { describe, expect, it } from "vitest"

import { mapDesktopEventDetail, mapEventDetail, type EventLineupRow } from "@/lib/mappers/event-detail"
import type { EventPublicView } from "@/lib/schemas/views"

// TICK-362 — the configured lineup must reach the public event page.
//
// The reported bug (lineup saved by the organizer, nothing on the public page)
// was fixed in #353, but nothing pinned the behaviour, so the same regression
// could return unnoticed: the page fetches event_artists, maps them, and the
// components render `event.lineup` — a break anywhere in that chain shows up as
// a silently missing section rather than an error.
//
// These cover the three shapes the ticket calls out — several artists, exactly
// one, and none — and assert desktop and mobile agree, since they are built by
// two different mapper entry points.

const EVENT_ROW = {
  id: "event-1",
  slug: "test-event",
  title: "Test Event",
  description: "A test event",
  poster_url: null,
  starts_at: "2026-09-01T18:00:00.000Z",
  ends_at: "2026-09-01T22:00:00.000Z",
  venue_name: "Test Venue",
  venue_capacity: 500,
  min_price_cents: 10_000,
  currency: "SZL",
  organizer_id: "org-1",
  organizer_name: "Test Org",
  organizer_logo_url: null,
} as unknown as EventPublicView

const artist = (name: string, role: string | null = null): EventLineupRow => ({
  artist_id: `artist-${name.toLowerCase()}`,
  artist_name: name,
  artist_slug: name.toLowerCase(),
  artist_image_url: null,
  role,
})

describe("public event lineup mapping (TICK-362)", () => {
  it("carries every configured artist through, in configured order", () => {
    const lineup = [artist("Lethu"), artist("Frans Mkhaliphi"), artist("Eljay"), artist("Mlungisi")]

    const mapped = mapEventDetail(EVENT_ROW, { lineup })

    expect(mapped.lineup.map((a) => a.name)).toEqual([
      "Lethu",
      "Frans Mkhaliphi",
      "Eljay",
      "Mlungisi",
    ])
  })

  it("handles a single-artist lineup", () => {
    const mapped = mapEventDetail(EVENT_ROW, { lineup: [artist("Bethel")] })

    expect(mapped.lineup).toHaveLength(1)
    expect(mapped.lineup[0].name).toBe("Bethel")
  })

  it("returns an empty lineup when none is configured, so the section hides cleanly", () => {
    // The components render the block behind `event.lineup.length > 0`, so an
    // empty array — not undefined — is what keeps them from rendering a header
    // above nothing.
    expect(mapEventDetail(EVENT_ROW, { lineup: [] }).lineup).toEqual([])
    expect(mapEventDetail(EVENT_ROW, {}).lineup).toEqual([])
    expect(mapEventDetail(EVENT_ROW, { lineup: undefined }).lineup).toEqual([])
  })

  it("keeps the organizer's configured role rather than inventing one", () => {
    const mapped = mapEventDetail(EVENT_ROW, {
      lineup: [artist("Tracy", "DJ"), artist("Bethel", "Choir")],
    })

    expect(mapped.lineup.map((a) => a.role)).toEqual(["DJ", "Choir"])
  })

  it("gives desktop and mobile the same lineup", () => {
    // Two entry points, one source of truth — mapDesktopEventDetail builds on
    // mapEventDetail, and this fails the moment it stops doing so.
    const lineup = [artist("Lethu"), artist("Eljay")]

    const mobile = mapEventDetail(EVENT_ROW, { lineup })
    const desktop = mapDesktopEventDetail(EVENT_ROW, [], { lineup })

    expect(desktop.lineup).toEqual(mobile.lineup)
    expect(desktop.lineup.map((a) => a.name)).toEqual(["Lethu", "Eljay"])
  })

  it("still renders an artist with no image", () => {
    // A missing image must not drop the artist from the list.
    const mapped = mapEventDetail(EVENT_ROW, {
      lineup: [{ ...artist("Nameless"), artist_image_url: null }],
    })

    expect(mapped.lineup).toHaveLength(1)
    expect(mapped.lineup[0].photo).toBeTruthy()
  })
})
