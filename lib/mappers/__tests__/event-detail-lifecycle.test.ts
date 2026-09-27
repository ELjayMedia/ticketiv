import { afterEach, describe, expect, it, vi } from "vitest"

import { mapDesktopEventDetail, mapEventDetail } from "@/lib/mappers/event-detail"
import type { EventPublicView } from "@/lib/schemas/views"

const EVENT_ROW = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "archive-test",
  title: "Archive Test",
  description: "Historical event",
  poster_url: null,
  starts_at: "2026-09-20T18:00:00.000Z",
  venue_name: "Test Venue",
  venue_capacity: 500,
  min_price_cents: 10_000,
  currency: "SZL",
  organizer_id: "22222222-2222-4222-8222-222222222222",
  organizer_name: "Test Org",
  organizer_logo_url: null,
} as unknown as EventPublicView

afterEach(() => {
  vi.useRealTimers()
})

describe("past event detail lifecycle (TICK-413)", () => {
  it("keeps the page transactional through the end grace window", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-20T23:00:00.000Z"))

    const mapped = mapEventDetail(EVENT_ROW, {
      eventEndsAt: "2026-09-20T20:00:00.000Z",
    })

    expect(mapped.hasEnded).toBe(false)
  })

  it("marks the page as historical after end plus grace", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-20T23:00:00.001Z"))

    const mapped = mapEventDetail(EVENT_ROW, {
      eventEndsAt: "2026-09-20T20:00:00.000Z",
    })

    expect(mapped.hasEnded).toBe(true)
    expect(mapped.organizerHref).toBe("/organisers/22222222-2222-4222-8222-222222222222")
  })

  it("maps explicit cancellation separately from an ended event", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-20T19:00:00.000Z"))

    const cancelled = {
      ...EVENT_ROW,
      status: "cancelled",
    } as unknown as EventPublicView

    const mapped = mapEventDetail(cancelled, {
      eventEndsAt: "2026-09-20T20:00:00.000Z",
    })

    expect(mapped.lifecycle).toBe("cancelled")
    expect(mapped.isCancelled).toBe(true)
    expect(mapped.hasEnded).toBe(false)
  })

  it("keeps desktop and mobile archive state aligned", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-21T10:00:00.000Z"))

    const mobile = mapEventDetail(EVENT_ROW, {
      eventEndsAt: "2026-09-20T20:00:00.000Z",
    })
    const desktop = mapDesktopEventDetail(EVENT_ROW, [], {
      eventEndsAt: "2026-09-20T20:00:00.000Z",
    })

    expect(mobile.hasEnded).toBe(true)
    expect(desktop.hasEnded).toBe(true)
  })
})
