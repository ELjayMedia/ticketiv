import { afterEach, describe, expect, it, vi } from "vitest";

import { mapMyTickets } from "@/lib/mappers/tickets";
import type { MyTicketsView } from "@/lib/schemas/views";

const NOW = new Date("2026-08-09T10:00:00.000Z");

function ticket(overrides: Partial<MyTicketsView> = {}): MyTicketsView {
  return {
    order_id: "11111111-1111-4111-8111-111111111111",
    buyer_id: "22222222-2222-4222-8222-222222222222",
    order_status: "paid",
    ordered_at: "2026-08-01T10:00:00.000Z",
    order_item_id: "33333333-3333-4333-8333-333333333333",
    ticket_code: "A85670F7-F7D8-4BFE-BA77-96FFA4FECBCE",
    checked_in_at: null,
    revoked_at: null,
    ticket_type_id: "44444444-4444-4444-8444-444444444444",
    ticket_type_name: "General",
    price_cents: 10000,
    currency: "ZAR",
    event_id: "55555555-5555-4555-8555-555555555555",
    event_title: "Future event",
    event_slug: "future-event",
    city: "Mbabane",
    cover_image_url: null,
    venue_name: "Main Hall",
    venue_address: "Mbabane",
    event_starts_at: "2026-08-09T12:00:00.000Z",
    order_item_status: "issued",
    refunded_at: null,
    transferred_from_order_item_id: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("mapMyTickets", () => {
  it("moves a successfully checked-in future ticket to Past immediately", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const result = mapMyTickets([
      ticket({
        order_item_status: "checked_in",
        checked_in_at: "2026-08-09T09:55:00.000Z",
      }),
    ]);

    expect(result.featured).toBeUndefined();
    expect(result.upcoming).toHaveLength(0);
    expect(result.past).toHaveLength(1);
    expect(result.past[0]).toMatchObject({
      status: "checked_in",
      checkedInAt: "2026-08-09T09:55:00.000Z",
    });
    expect(result.counts).toEqual({ upcoming: 0, past: 1, transfers: 0 });
  });

  it("keeps an unscanned future ticket in Upcoming", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);

    const result = mapMyTickets([ticket()]);

    expect(result.featured?.ticketId).toBe("33333333-3333-4333-8333-333333333333");
    expect(result.past).toHaveLength(0);
    expect(result.counts).toEqual({ upcoming: 1, past: 0, transfers: 0 });
  });
});
