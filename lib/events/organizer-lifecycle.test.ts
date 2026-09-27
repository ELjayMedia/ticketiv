import { describe, expect, it } from "vitest";

import { resolveOrganizerEventLifecycle } from "@/lib/events/organizer-lifecycle";

const NOW = new Date("2026-09-27T10:00:00.000Z").getTime();

describe("resolveOrganizerEventLifecycle", () => {
  it("keeps explicit terminal/workflow states distinct", () => {
    expect(resolveOrganizerEventLifecycle({ status: "published", starts_at: null, cancelled_at: "2026-09-27T09:00:00Z" }, null, NOW)).toBe("cancelled");
    expect(resolveOrganizerEventLifecycle({ status: "draft", starts_at: null }, null, NOW)).toBe("draft");
    expect(resolveOrganizerEventLifecycle({ status: "archived", starts_at: null }, null, NOW)).toBe("archived");
    expect(resolveOrganizerEventLifecycle({ status: "paused", starts_at: null }, null, NOW)).toBe("paused");
  });

  it("classifies future, live and ended published events", () => {
    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-28T10:00:00Z",
      ends_at: "2026-09-28T14:00:00Z",
    }, null, NOW)).toBe("upcoming");

    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-27T08:00:00Z",
      ends_at: "2026-09-27T12:00:00Z",
    }, null, NOW)).toBe("active");

    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-26T08:00:00Z",
      ends_at: "2026-09-26T12:00:00Z",
    }, null, NOW)).toBe("past");
  });

  it("uses the final multi-date occurrence", () => {
    expect(resolveOrganizerEventLifecycle({
      status: "published",
      starts_at: "2026-09-20T08:00:00Z",
      ends_at: "2026-09-20T12:00:00Z",
    }, "2026-09-28T20:00:00Z", NOW)).toBe("active");
  });
});
