import { describe, expect, it } from "vitest";

import {
  EVENT_END_GRACE_MS,
  deriveEventLifecycle,
  isEventPast,
} from "@/lib/events/lifecycle";

describe("event lifecycle", () => {
  const startIso = "2026-08-09T12:00:00.000Z";
  const endIso = "2026-08-09T14:00:00.000Z";
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  it("derives upcoming before the event starts", () => {
    expect(deriveEventLifecycle({
      status: "published",
      eventStartsAt: startIso,
      eventEndsAt: endIso,
      nowMs: start - 1,
    })).toBe("upcoming");
  });

  it("derives live from start through the operational grace window", () => {
    expect(deriveEventLifecycle({
      status: "published",
      eventStartsAt: startIso,
      eventEndsAt: endIso,
      nowMs: start,
    })).toBe("live");

    expect(deriveEventLifecycle({
      status: "published",
      eventStartsAt: startIso,
      eventEndsAt: endIso,
      nowMs: end + EVENT_END_GRACE_MS,
    })).toBe("live");
  });

  it("moves an event to ended only after end plus grace", () => {
    expect(isEventPast({
      eventStartsAt: startIso,
      eventEndsAt: endIso,
      nowMs: end + EVENT_END_GRACE_MS + 1,
    })).toBe(true);
  });

  it("honours explicit draft and cancelled states", () => {
    expect(deriveEventLifecycle({
      status: "draft",
      eventStartsAt: startIso,
      eventEndsAt: endIso,
      nowMs: start + 1,
    })).toBe("draft");

    expect(deriveEventLifecycle({
      status: "cancelled",
      eventStartsAt: startIso,
      eventEndsAt: endIso,
      nowMs: start - 1,
    })).toBe("cancelled");
  });

  it("falls back to the known start when an end time is unavailable", () => {
    expect(isEventPast({
      eventStartsAt: startIso,
      nowMs: start + EVENT_END_GRACE_MS + 1,
    })).toBe(true);
  });

  it("does not guess that an undated published event is past", () => {
    expect(deriveEventLifecycle({ status: "published", nowMs: end })).toBe("live");
    expect(isEventPast({ status: "published", nowMs: end })).toBe(false);
  });
});
