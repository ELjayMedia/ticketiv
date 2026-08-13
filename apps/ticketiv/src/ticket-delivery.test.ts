import { describe, expect, it, vi } from "vitest";

import {
  canUseCachedTicketivTicketDelivery,
  fetchTicketivTicketDelivery,
  findTicketivWalletTicketByDeliveryToken,
  importTicketivTicketDelivery,
} from "./ticket-delivery";
import { createTicketivWalletState, createTicketivWalletTicket } from "./ticket-wallet";

const ticketPayload = {
  id: "ticket-1",
  orderId: "order-1",
  eventId: "event-1",
  eventTitle: "Launch Night",
  eventSlug: "launch-night",
  ticketCode: "TIV-ENTRY-001",
  deliveryToken: "server-token",
  ticketTypeName: "General",
  holderName: null,
  eventStartsAt: "2026-09-01T18:00:00.000Z",
  venueName: "Arena",
  venueAddress: "Main Road",
  coverImageUrl: null,
  status: "issued" as const,
  checkedInAt: null,
  revokedAt: null,
  refundedAt: null,
  priceCents: 25000,
  currency: "SZL",
  updatedAt: "2026-08-13T00:00:00.000Z",
};

describe("Ticketiv native ticket delivery", () => {
  it("fetches and validates one capability-scoped ticket", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          expiresAt: "2026-09-08T18:00:00.000Z",
          syncedAt: "2026-08-13T00:00:00.000Z",
          ticket: ticketPayload,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const delivery = await fetchTicketivTicketDelivery(
      "message-token",
      fetcher as typeof fetch,
      "https://ticketiv.app"
    );

    expect(fetcher).toHaveBeenCalledWith(
      "https://ticketiv.app/api/mobile/tickets/message-token",
      { headers: { Accept: "application/json" } }
    );
    expect(delivery.ticket.deliveryToken).toBe("message-token");
    expect(delivery.ticket.offlineExpiresAt).toBe("2026-09-08T18:00:00.000Z");
    expect(delivery.ticket.ticketCode).toBe("TIV-ENTRY-001");
  });

  it.each([
    [410, "expired"],
    [404, "no longer valid"],
    [503, "unavailable"],
  ])("maps delivery HTTP %s to a useful error", async (status, message) => {
    const fetcher = vi.fn(async () => new Response("{}", { status }));
    await expect(
      fetchTicketivTicketDelivery("token", fetcher as typeof fetch)
    ).rejects.toThrow(message);
  });

  it("permits cached fallback only for service or network unavailability", async () => {
    const unavailable = await fetchTicketivTicketDelivery(
      "token",
      vi.fn(async () => new Response("{}", { status: 503 })) as typeof fetch
    ).catch((error: unknown) => error);
    const invalid = await fetchTicketivTicketDelivery(
      "token",
      vi.fn(async () => new Response("{}", { status: 404 })) as typeof fetch
    ).catch((error: unknown) => error);
    const offline = await fetchTicketivTicketDelivery(
      "token",
      vi.fn(async () => {
        throw new TypeError("Network request failed");
      }) as typeof fetch
    ).catch((error: unknown) => error);

    expect(canUseCachedTicketivTicketDelivery(unavailable)).toBe(true);
    expect(canUseCachedTicketivTicketDelivery(offline)).toBe(true);
    expect(canUseCachedTicketivTicketDelivery(invalid)).toBe(false);
  });

  it("replaces stale live state, updates sync time, and supports offline token lookup", () => {
    const stale = createTicketivWalletTicket({
      ...ticketPayload,
      status: "issued",
      updatedAt: "2026-08-12T00:00:00.000Z",
    });
    const wallet = createTicketivWalletState({ tickets: [stale], syncedAt: null });
    const revoked = createTicketivWalletTicket({
      ...ticketPayload,
      status: "revoked",
      revokedAt: "2026-08-13T00:00:00.000Z",
    });
    const next = importTicketivTicketDelivery(wallet, {
      expiresAt: "2026-09-08T18:00:00.000Z",
      syncedAt: "2026-08-13T00:00:00.000Z",
      ticket: revoked,
    });

    expect(next.syncedAt).toBe("2026-08-13T00:00:00.000Z");
    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0].status).toBe("revoked");
    expect(findTicketivWalletTicketByDeliveryToken(next, "server-token")?.id).toBe("ticket-1");
  });

  it("rejects malformed ticket responses before they reach secure storage", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          expiresAt: "2026-09-08T18:00:00.000Z",
          syncedAt: "2026-08-13T00:00:00.000Z",
          ticket: { eventTitle: "Missing identifiers", status: "issued" },
        }),
        { status: 200 }
      )
    );
    await expect(
      fetchTicketivTicketDelivery("token", fetcher as typeof fetch)
    ).rejects.toThrow("Ticket id is required");
  });

  it("rejects an unknown live ticket status before secure storage", async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          expiresAt: "2026-09-08T18:00:00.000Z",
          syncedAt: "2026-08-13T00:00:00.000Z",
          ticket: { ...ticketPayload, status: "cancelled" },
        }),
        { status: 200 }
      )
    );
    await expect(
      fetchTicketivTicketDelivery("token", fetcher as typeof fetch)
    ).rejects.toThrow("Ticket delivery status is invalid");
  });
});
