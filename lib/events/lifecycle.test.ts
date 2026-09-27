import { describe, expect, it } from "vitest";

import {
  EVENT_END_GRACE_MS,
  isEventPast,
  resolveEventLifecycle,
} from "@/lib/events/lifecycle";

describe("resolveEventLifecycle", () => {
  const start = new Date("2026-08-09T12:00:00.000Z").getTime();
  const end = new Date("2026-08-09T14:00:00.000Z").getTime();

  it("is upcoming before the event starts", () => {
    expect(resolveEventLifecycle({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: start - 1,
    })).toBe("upcoming");
  });

  it("becomes live exactly at the start boundary", () => {
    expect(resolveEventLifecycle({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: start,
    })).toBe("live");
  });

  it("stays live at the scheduled end and throughout the three-hour grace", () => {
    expect(resolveEventLifecycle({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: end,
    })).toBe("live");

    expect(resolveEventLifecycle({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: end + EVENT_END_GRACE_MS,
    })).toBe("live");
  });

  it("becomes ended only after final occurrence end plus grace", () => {
    expect(resolveEventLifecycle({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: end + EVENT_END_GRACE_MS + 1,
    })).toBe("ended");
  });

  it("lets explicit cancellation override a future or live schedule", () => {
    expect(resolveEventLifecycle({
      eventStatus: "cancelled",
      eventStartsAt: "2026-08-10T12:00:00.000Z",
      eventEndsAt: "2026-08-10T14:00:00.000Z",
      nowMs: start,
    })).toBe("cancelled");
  });

  it("uses the supplied final occurrence for multi-date events", () => {
    expect(resolveEventLifecycle({
      eventStartsAt: "2026-08-01T12:00:00.000Z",
      eventEndsAt: "2026-08-10T20:00:00.000Z",
      nowMs: new Date("2026-08-09T23:00:00.000Z").getTime(),
    })).toBe("live");
  });

  it("falls back to the start when an end time is unavailable", () => {
    expect(isEventPast({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      nowMs: start + EVENT_END_GRACE_MS + 1,
    })).toBe(true);
  });

  it("does not guess that an undated event is past", () => {
    expect(resolveEventLifecycle({
      nowMs: end + EVENT_END_GRACE_MS + 1,
    })).toBe("upcoming");
    expect(isEventPast({
      nowMs: end + EVENT_END_GRACE_MS + 1,
    })).toBe(false);
  });
});
