import { describe, expect, it } from "vitest";

import type { SecureStorageAdapter } from "@ticketiv/shared";
import {
  TICKETIV_WALLET_STORAGE_KEY,
  buildTicketivWalletTicketLink,
  clearTicketivWallet,
  createTicketivWalletState,
  createTicketivWalletTicket,
  describeTicketivWalletTicket,
  loadTicketivWallet,
  parseTicketivWallet,
  qrPayloadForTicketivWalletTicket,
  saveTicketivWallet,
  summarizeTicketivWallet,
  ticketivWalletRouteFromDeepLink,
  upsertTicketivWalletTicket,
} from "./ticket-wallet";

class MemorySecureStorage implements SecureStorageAdapter {
  private readonly values = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.values.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.values.delete(key);
  }
}

function ticket(overrides: Partial<Parameters<typeof createTicketivWalletTicket>[0]> = {}) {
  return createTicketivWalletTicket({
    id: "ticket-1",
    orderId: "order-1",
    eventId: "event-1",
    eventTitle: "Launch Night",
    eventSlug: "launch-night",
    ticketCode: "TIV-1",
    deliveryToken: "token-1",
    ticketTypeName: "General",
    holderName: "Anele",
    eventStartsAt: "2026-08-01T18:00:00.000Z",
    venueName: "The Arena",
    venueAddress: "Main Road",
    coverImageUrl: "https://ticketiv.app/poster.jpg",
    checkedInAt: null,
    revokedAt: null,
    refundedAt: null,
    priceCents: 25000,
    currency: "SZL",
    updatedAt: "2026-07-18T14:25:00.000Z",
    ...overrides,
  });
}

describe("Ticketiv consumer ticket wallet", () => {
  it("stores valid tickets with an offline QR payload", () => {
    const stored = ticket({ ticketCode: " TIV-ABC " });

    expect(stored.ticketCode).toBe("TIV-ABC");
    expect(qrPayloadForTicketivWalletTicket(stored)).toBe("TIV-ABC");
    expect(describeTicketivWalletTicket(stored)).toMatchObject({
      title: "Launch Night",
      venueLabel: "The Arena",
      priceLabel: "E250",
      deepLink: "ticketiv://t/token-1",
    });
  });

  it("hides QR payloads for checked-in, transferred, revoked, or refunded tickets", () => {
    expect(
      qrPayloadForTicketivWalletTicket(
        ticket({ status: "checked_in", checkedInAt: "2026-08-01T18:30:00.000Z" })
      )
    ).toBeNull();
    expect(qrPayloadForTicketivWalletTicket(ticket({ status: "transferred" }))).toBeNull();
    expect(
      qrPayloadForTicketivWalletTicket(
        ticket({ status: "revoked", revokedAt: "2026-07-31T08:00:00.000Z" })
      )
    ).toBeNull();
    expect(
      qrPayloadForTicketivWalletTicket(
        ticket({ status: "refunded", refundedAt: "2026-07-31T08:00:00.000Z" })
      )
    ).toBeNull();
  });

  it("deduplicates tickets and keeps the soonest event first", () => {
    const later = ticket({
      id: "ticket-2",
      eventTitle: "After Party",
      eventStartsAt: "2026-08-03T20:00:00.000Z",
    });
    const earlier = ticket({
      id: "ticket-1",
      eventTitle: "Launch Night Updated",
      eventStartsAt: "2026-08-01T18:00:00.000Z",
      updatedAt: "2026-07-18T14:30:00.000Z",
    });

    const wallet = createTicketivWalletState({ tickets: [later, ticket()] });
    const updated = upsertTicketivWalletTicket(wallet, earlier);

    expect(updated.tickets.map((item) => item.id)).toEqual(["ticket-1", "ticket-2"]);
    expect(updated.tickets[0].eventTitle).toBe("Launch Night Updated");
  });

  it("summarizes wallet readiness for buyer-to-gate UAT", () => {
    const wallet = createTicketivWalletState({
      syncedAt: null,
      tickets: [
        ticket(),
        ticket({
          id: "ticket-2",
          status: "checked_in",
          checkedInAt: "2026-07-01T12:00:00.000Z",
          eventStartsAt: "2026-07-01T10:00:00.000Z",
        }),
        ticket({ id: "ticket-3", status: "pending" }),
      ],
    });

    expect(summarizeTicketivWallet(wallet, new Date("2026-07-18T14:30:00.000Z").getTime())).toEqual({
      total: 2,
      validForEntry: 1,
      upcoming: 1,
      past: 1,
      needsSync: true,
    });
  });

  it("saves and restores wallet state through secure storage", async () => {
    const storage = new MemorySecureStorage();
    const wallet = createTicketivWalletState({
      syncedAt: "2026-07-18T14:30:00.000Z",
      tickets: [ticket()],
    });

    await saveTicketivWallet(storage, wallet);
    const restored = await loadTicketivWallet(storage);

    expect(restored).toMatchObject({
      syncedAt: "2026-07-18T14:30:00.000Z",
      tickets: [{ id: "ticket-1", ticketCode: "TIV-1" }],
    });

    await clearTicketivWallet(storage);
    expect(await loadTicketivWallet(storage)).toBeNull();
  });

  it("rejects corrupt or unsupported wallet snapshots", async () => {
    const storage = new MemorySecureStorage();

    await storage.setItem(TICKETIV_WALLET_STORAGE_KEY, "{bad json");
    expect(await loadTicketivWallet(storage)).toBeNull();
    expect(parseTicketivWallet("{bad json")).toEqual({
      ok: false,
      error: "invalid_json",
    });

    await storage.setItem(TICKETIV_WALLET_STORAGE_KEY, JSON.stringify({ schemaVersion: 2 }));
    expect(await loadTicketivWallet(storage)).toBeNull();
    expect(parseTicketivWallet(JSON.stringify({ schemaVersion: 2 }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
  });

  it("builds ticket links and routes delivery deep links", () => {
    expect(buildTicketivWalletTicketLink(ticket())).toBe("ticketiv://t/token-1");
    expect(buildTicketivWalletTicketLink(ticket({ deliveryToken: null }))).toBe(
      "ticketiv://tickets/ticket-1"
    );
    expect(ticketivWalletRouteFromDeepLink("https://ticketiv.app/t/token-1")).toEqual({
      route: "ticket-token",
      token: "token-1",
    });
    expect(ticketivWalletRouteFromDeepLink("ticketiv://events/launch-night")).toEqual({
      route: "event",
      slugOrId: "launch-night",
    });
  });
});
