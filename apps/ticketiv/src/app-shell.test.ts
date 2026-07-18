import { describe, expect, it, vi } from "vitest";

import type {
  BrowserSessionAdapter,
  SecureStorageAdapter,
} from "@ticketiv/adapters";
import {
  bootTicketivConsumerAppShell,
  applyTicketivConsumerDeepLink,
  cancelTicketivConsumerCheckout,
  createTicketivConsumerAppShellState,
  startTicketivConsumerHostedCheckout,
  summarizeTicketivConsumerAppShell,
} from "./app-shell";
import {
  createTicketivCheckoutHandoff,
  loadTicketivCheckoutHandoff,
  saveTicketivCheckoutHandoff,
} from "./checkout-handoff";
import {
  createTicketivWalletState,
  createTicketivWalletTicket,
  saveTicketivWallet,
} from "./ticket-wallet";

class MemorySecureStorage implements SecureStorageAdapter {
  readonly values = new Map<string, string>();

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

const hostedCheckout = {
  checkoutUrl: "https://checkout.paystack.com/abc123",
  orderId: "order-1",
  paymentAttemptId: "attempt-1",
  provider: "paystack",
  nextPath: "/tickets",
  startedAt: "2026-07-18T19:10:00.000Z",
};

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

describe("Ticketiv consumer app shell", () => {
  it("boots from secure storage and resumes pending checkout before wallet tabs", async () => {
    const storage = new MemorySecureStorage();
    await saveTicketivWallet(
      storage,
      createTicketivWalletState({
        syncedAt: "2026-07-18T14:30:00.000Z",
        tickets: [ticket()],
      })
    );
    await saveTicketivCheckoutHandoff(
      storage,
      createTicketivCheckoutHandoff(hostedCheckout)
    );

    const state = await bootTicketivConsumerAppShell({
      storage,
      bootedAt: "2026-07-18T19:15:00.000Z",
    });

    expect(state).toMatchObject({
      activeRoute: { route: "checkout", orderId: "order-1", status: "pending" },
      bootedAt: "2026-07-18T19:15:00.000Z",
      wallet: { tickets: [{ id: "ticket-1" }] },
      checkoutHandoff: { orderId: "order-1", status: "pending" },
    });
  });

  it("routes consumer delivery, event, settings and auth deep links", () => {
    const state = createTicketivConsumerAppShellState();

    expect(
      applyTicketivConsumerDeepLink(state, "https://ticketiv.app/t/token-1")
    ).toMatchObject({
      activeRoute: { route: "ticket-token", token: "token-1" },
      lastDeepLink: "https://ticketiv.app/t/token-1",
    });
    expect(
      applyTicketivConsumerDeepLink(state, "ticketiv://events/launch-night")
        .activeRoute
    ).toEqual({ route: "event", slugOrId: "launch-night" });
    expect(
      applyTicketivConsumerDeepLink(state, "ticketiv://account/settings")
        .activeRoute
    ).toEqual({ route: "account-settings" });
    expect(
      applyTicketivConsumerDeepLink(
        state,
        "ticketiv://auth/callback?app=consumer&code=abc&next=/tickets"
      ).activeRoute
    ).toEqual({ route: "auth-callback", nextPath: "/tickets" });
  });

  it("completes matching checkout returns without accepting unrelated orders", () => {
    const state = createTicketivConsumerAppShellState({
      checkoutHandoff: createTicketivCheckoutHandoff(hostedCheckout),
      bootedAt: "2026-07-18T19:10:00.000Z",
    });

    const returned = applyTicketivConsumerDeepLink(
      state,
      "ticketiv://checkout/return?orderId=order-1&paymentAttemptId=attempt-1&next=/orders/order-1/confirmation",
      "2026-07-18T19:12:00.000Z"
    );

    expect(returned).toMatchObject({
      activeRoute: { route: "order-confirmation", orderId: "order-1" },
      checkoutHandoff: {
        status: "returned",
        returnedAt: "2026-07-18T19:12:00.000Z",
      },
      lastError: null,
    });

    const unrelated = applyTicketivConsumerDeepLink(
      state,
      "ticketiv://checkout/return?orderId=other-order&paymentAttemptId=attempt-1"
    );

    expect(unrelated.activeRoute).toEqual({
      route: "checkout",
      orderId: "order-1",
      status: "pending",
    });
    expect(unrelated.checkoutHandoff).toBe(state.checkoutHandoff);
    expect(unrelated.lastError).toMatchObject({
      code: "checkout-return-mismatch",
    });
  });

  it("starts hosted checkout through native browser sessions and persists handoff state", async () => {
    const storage = new MemorySecureStorage();
    const openSession = vi.fn<BrowserSessionAdapter["openSession"]>(async () => {});
    const state = await startTicketivConsumerHostedCheckout(
      createTicketivConsumerAppShellState(),
      { browserSession: { openSession }, secureStorage: storage },
      hostedCheckout
    );

    expect(state).toMatchObject({
      activeRoute: { route: "checkout", orderId: "order-1", status: "pending" },
      checkoutHandoff: { orderId: "order-1", status: "pending" },
    });
    expect(openSession).toHaveBeenCalledWith({
      url: "https://checkout.paystack.com/abc123",
      callbackUrl: "ticketiv://checkout/return?orderId=order-1&paymentAttemptId=attempt-1&next=%2Ftickets",
      presentation: "custom_tab",
      prefersEphemeralSession: false,
    });
    expect(await loadTicketivCheckoutHandoff(storage)).toMatchObject({
      orderId: "order-1",
      status: "pending",
    });
  });

  it("requires a browser session adapter before starting hosted checkout", async () => {
    await expect(
      startTicketivConsumerHostedCheckout(
        createTicketivConsumerAppShellState(),
        {},
        hostedCheckout
      )
    ).rejects.toThrow("Missing platform adapter(s): browserSession");
  });

  it("can cancel pending checkout and report UAT readiness blockers", async () => {
    const storage = new MemorySecureStorage();
    const wallet = createTicketivWalletState({ tickets: [ticket()] });
    const state = createTicketivConsumerAppShellState({
      wallet,
      checkoutHandoff: createTicketivCheckoutHandoff(hostedCheckout),
    });

    const cancelled = await cancelTicketivConsumerCheckout(
      state,
      storage,
      "2026-07-18T19:13:00.000Z"
    );

    expect(cancelled).toMatchObject({
      activeRoute: { route: "tickets" },
      checkoutHandoff: {
        status: "cancelled",
        returnedAt: "2026-07-18T19:13:00.000Z",
      },
    });

    expect(
      summarizeTicketivConsumerAppShell(cancelled, {
        secureStorage: storage,
        browserSession: { openSession: async () => {} },
      })
    ).toMatchObject({
      route: "tickets",
      checkoutStatus: "cancelled",
      canOpenHostedCheckout: true,
      canRenderOfflineQr: true,
      hasPendingCheckout: false,
      blockers: [],
    });

    expect(summarizeTicketivConsumerAppShell(createTicketivConsumerAppShellState())).toMatchObject({
      canOpenHostedCheckout: false,
      canRenderOfflineQr: false,
      blockers: [
        "secure-storage-missing",
        "browser-session-missing",
        "offline-wallet-empty",
      ],
    });
  });
});
