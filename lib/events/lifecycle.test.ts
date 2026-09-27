import { describe, expect, it } from "vitest";

import { EVENT_END_GRACE_MS, isEventPast } from "@/lib/events/lifecycle";

describe("isEventPast", () => {
  const end = new Date("2026-08-09T14:00:00.000Z").getTime();

  it("keeps an event active through the three-hour operational grace window", () => {
    expect(isEventPast({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: end + EVENT_END_GRACE_MS,
    })).toBe(false);
  });

  it("moves an event to past only after end plus grace", () => {
    expect(isEventPast({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      eventEndsAt: "2026-08-09T14:00:00.000Z",
      nowMs: end + EVENT_END_GRACE_MS + 1,
    })).toBe(true);
  });

  it("falls back to the known start when an end time is unavailable", () => {
    const start = new Date("2026-08-09T12:00:00.000Z").getTime();
    expect(isEventPast({
      eventStartsAt: "2026-08-09T12:00:00.000Z",
      nowMs: start + EVENT_END_GRACE_MS + 1,
    })).toBe(true);
  });

  it("does not guess that an undated event is past", () => {
    expect(isEventPast({ nowMs: end + EVENT_END_GRACE_MS + 1 })).toBe(false);
  });
});
