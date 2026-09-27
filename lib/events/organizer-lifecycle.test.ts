import { describe, expect, it } from "vitest"

import { resolveOrganizerEventLifecycle } from "@/lib/events/organizer-lifecycle"

const NOW = new Date("2026-09-27T10:00:00.000Z").getTime()

describe("resolveOrganizerEventLifecycle", () => {
  it("keeps explicit draft, archived and paused states distinct", () => {
    expect(resolveOrganizerEventLifecycle({ status: "draft", starts_at: null }, null, NOW)).toBe("draft")
    expect(resolveOrganizerEventLifecycle({ status: "archived", starts_at: null }, null, NOW)).toBe("archived")
    expect(resolveOrganizerEventLifecycle({ status: "paused", starts_at: null }, null, NOW)).toBe("paused")
  })

  it("classifies future published events as upcoming", () => {
    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-28T10:00:00.000Z",
      ends_at: "2026-09-28T14:00:00.000Z",
    }, null, NOW)).toBe("upcoming")
  })

  it("classifies an in-flight event as active", () => {
    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-27T08:00:00.000Z",
      ends_at: "2026-09-27T12:00:00.000Z",
    }, null, NOW)).toBe("active")
  })

  it("classifies an ended event as past after the grace window", () => {
    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-26T08:00:00.000Z",
      ends_at: "2026-09-26T12:00:00.000Z",
    }, null, NOW)).toBe("past")
  })

  it("uses the final multi-date occurrence instead of the first event start", () => {
    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-20T08:00:00.000Z",
      ends_at: "2026-09-20T12:00:00.000Z",
    }, "2026-09-28T20:00:00.000Z", NOW)).toBe("active")
  })
})
