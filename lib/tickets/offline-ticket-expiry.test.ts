import { describe, expect, it } from "vitest";

import { resolveOfflineTicketExpiry } from "@/lib/tickets/offline-ticket-expiry";

describe("resolveOfflineTicketExpiry", () => {
  const now = Date.parse("2026-08-10T08:00:00.000Z");

  it("prefers the event end and keeps a short post-event grace period", () => {
    expect(resolveOfflineTicketExpiry({
      eventEndsAt: "2026-08-10T20:00:00.000Z",
      eventStartsAt: "2026-08-10T17:00:00.000Z",
      now,
    })).toBe("2026-08-12T20:00:00.000Z");
  });

  it("falls back to the event start when no end is available", () => {
    expect(resolveOfflineTicketExpiry({
      eventStartsAt: "2026-08-11T17:00:00.000Z",
      now,
    })).toBe("2026-08-13T17:00:00.000Z");
  });

  it("uses a bounded seven-day fallback for date-TBA tickets", () => {
    expect(resolveOfflineTicketExpiry({ now })).toBe("2026-08-17T08:00:00.000Z");
  });
});
