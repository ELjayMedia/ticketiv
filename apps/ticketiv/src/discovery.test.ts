import { describe, expect, it, vi } from "vitest";

import {
  fetchTicketivDiscoverEvents,
  readTicketivDiscoverEvents,
  type TicketivDiscoverEvent,
} from "./discovery";

const EVENT: TicketivDiscoverEvent = {
  id: "event-1",
  slug: "launch-night",
  title: "Launch Night",
  photo: "https://ticketiv.app/poster.jpg",
  whenLabel: "8 Aug | 18:00",
  venue: "House on Fire",
  city: "Malkerns",
  priceLabel: "From SZL 150",
  category: "Music",
  stockLabel: "Only 8 left",
  stockType: "low",
};

describe("Ticketiv native discovery", () => {
  it("keeps valid event rows and rejects malformed rows", () => {
    expect(readTicketivDiscoverEvents({ events: [EVENT, { id: "missing-fields" }] })).toEqual([
      EVENT,
    ]);
  });

  it("returns an empty list for a non-event payload", () => {
    expect(readTicketivDiscoverEvents({ error: "signed_out" })).toEqual([]);
    expect(readTicketivDiscoverEvents(null)).toEqual([]);
  });

  it("requests the canonical public endpoint and rejects HTTP failures", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ events: [EVENT] }) });

    await expect(fetchTicketivDiscoverEvents(fetcher)).resolves.toEqual([EVENT]);
    expect(fetcher).toHaveBeenCalledWith(
      "https://ticketiv.app/api/discover/events?limit=24",
      { headers: { accept: "application/json" } }
    );

    fetcher.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    await expect(fetchTicketivDiscoverEvents(fetcher)).rejects.toThrow(
      "Events are unavailable right now."
    );
  });
});
