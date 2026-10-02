import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ getPublicEventsList: vi.fn() }))

vi.mock("@/lib/adapters/events", () => ({ getPublicEventsList: mocks.getPublicEventsList }))

import { getDiscoverFeed, getDiscoverSection } from "@/lib/data/public/discover-feed"
import { DISCOVER_WEEK_MS, pickEditorPick, type DiscoverEvent } from "@/lib/mappers/discover"

const NOW = Date.parse("2026-10-02T12:00:00Z")
const WEEK_END = new Date(NOW + DISCOVER_WEEK_MS).toISOString()

function row(id: string, startsAt: string, featured: number | null = null) {
  return {
    id, slug: id, title: id, poster_url: null, starts_at: startsAt, venue_name: "Venue", city: "Manzini",
    min_price_cents: 5000, currency: "SZL", category: "Music", featured_priority: featured,
    tickets_sold: null, tickets_available: null, organizer_name: null, organizer_logo_url: null,
  }
}

describe("discover feed", () => {
  beforeEach(() => vi.clearAllMocks())

  it("this week = every current event starting within 7 days, with no lower bound and no location", async () => {
    mocks.getPublicEventsList.mockResolvedValue([])
    await getDiscoverSection("thisWeek", { limit: 12, nowMs: NOW })
    const params = mocks.getPublicEventsList.mock.calls[0][0]
    expect(params).toMatchObject({ lifecycle: "current", startsBefore: WEEK_END, sort: "soonest", limit: 13, offset: 0 })
    expect(params.startsAfter).toBeUndefined()
    expect(params).not.toHaveProperty("city")
  })

  it("upcoming = every current event starting after this week, with no upper bound", async () => {
    mocks.getPublicEventsList.mockResolvedValue([])
    await getDiscoverSection("upcoming", { limit: 9, offset: 9, nowMs: NOW })
    const params = mocks.getPublicEventsList.mock.calls[0][0]
    expect(params).toMatchObject({ lifecycle: "current", startsAfter: WEEK_END, limit: 10, offset: 9 })
    expect(params.startsBefore).toBeUndefined()
  })

  it("reports hasMore from the extra row and never returns it", async () => {
    mocks.getPublicEventsList.mockResolvedValue([row("a", "2026-10-20T18:00:00Z"), row("b", "2026-10-21T18:00:00Z")])
    const section = await getDiscoverSection("upcoming", { limit: 1, nowMs: NOW })
    expect(section.events.map((e) => e.id)).toEqual(["a"])
    expect(section.hasMore).toBe(true)
  })

  it("picks the featured event across both sections", async () => {
    mocks.getPublicEventsList
      .mockResolvedValueOnce([row("soon", "2026-10-03T18:00:00Z")])
      .mockResolvedValueOnce([row("featured", "2026-11-01T18:00:00Z", 5)])
    const feed = await getDiscoverFeed(NOW)
    expect(feed.thisWeek.events.map((e) => e.id)).toEqual(["soon"])
    expect(feed.upcoming.events.map((e) => e.id)).toEqual(["featured"])
    expect(feed.editorPick?.id).toBe("featured")
  })

  it("falls back to the soonest event when nothing is featured", () => {
    const events = [{ id: "first", featuredPriority: null }, { id: "second", featuredPriority: null }] as DiscoverEvent[]
    expect(pickEditorPick(events)?.id).toBe("first")
    expect(pickEditorPick([])).toBeNull()
  })
})
