import { describe, expect, it, vi } from "vitest";

import type {
  BrowserSessionAdapter,
  SecureStorageAdapter,
} from "@ticketiv/adapters";
import {
  TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY,
  buildTicketivCheckoutReturnLink,
  cancelTicketivCheckoutHandoff,
  clearTicketivCheckoutHandoff,
  completeTicketivCheckoutReturn,
  createTicketivCheckoutHandoff,
  loadTicketivCheckoutHandoff,
  parseTicketivCheckoutHandoff,
  saveTicketivCheckoutHandoff,
  startTicketivHostedCheckout,
  ticketivConsumerRouteFromDeepLink,
} from "./checkout-handoff";

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

describe("Ticketiv consumer checkout handoff", () => {
  it("builds native checkout return links with order, attempt and next route", () => {
    expect(
      buildTicketivCheckoutReturnLink({
        orderId: "order-1",
        paymentAttemptId: "attempt-1",
        status: "success",
        nextPath: "tickets",
      })
    ).toBe(
      "ticketiv://checkout/return?orderId=order-1&paymentAttemptId=attempt-1&status=success&next=%2Ftickets"
    );
  });

  it("starts a hosted checkout through the browser session adapter and persists pending state", async () => {
    const storage = new MemorySecureStorage();
    const openSession = vi.fn<BrowserSessionAdapter["openSession"]>(async () => {});
    const browserSession: BrowserSessionAdapter = { openSession };

    const handoff = await startTicketivHostedCheckout(
      browserSession,
      hostedCheckout,
      storage
    );

    expect(handoff).toMatchObject({
      checkoutUrl: "https://checkout.paystack.com/abc123",
      callbackUrl: "ticketiv://checkout/return?orderId=order-1&paymentAttemptId=attempt-1&next=%2Ftickets",
      orderId: "order-1",
      paymentAttemptId: "attempt-1",
      provider: "paystack",
      status: "pending",
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

  it("rejects non-HTTPS checkout URLs before opening a browser session", async () => {
    const openSession = vi.fn<BrowserSessionAdapter["openSession"]>(async () => {});
    await expect(
      startTicketivHostedCheckout(
        { openSession },
        { ...hostedCheckout, checkoutUrl: "http://checkout.example.test" }
      )
    ).rejects.toThrow("Checkout URL must use HTTPS");
    expect(openSession).not.toHaveBeenCalled();
  });

  it("parses checkout return app links and production order confirmation links", () => {
    expect(
      ticketivConsumerRouteFromDeepLink(
        "ticketiv://checkout/return?orderId=order-1&paymentId=pay-1&status=success&next=/tickets"
      )
    ).toEqual({
      route: "checkout-return",
      orderId: "order-1",
      paymentAttemptId: "pay-1",
      status: "success",
      nextPath: "/tickets",
      params: {
        orderId: "order-1",
        paymentId: "pay-1",
        status: "success",
        next: "/tickets",
      },
    });

    expect(
      ticketivConsumerRouteFromDeepLink(
        "https://ticketiv.app/orders/order-1/confirmation?paymentId=pay-1"
      )
    ).toMatchObject({
      route: "checkout-return",
      orderId: "order-1",
      paymentAttemptId: "pay-1",
      nextPath: "/orders/order-1/confirmation",
    });
  });

  it("routes existing ticket, event, tickets, settings and auth deep links", () => {
    expect(ticketivConsumerRouteFromDeepLink("https://ticketiv.app/t/token-1")).toEqual({
      route: "ticket-token",
      token: "token-1",
      params: {},
    });
    expect(ticketivConsumerRouteFromDeepLink("ticketiv://events/launch-night")).toEqual({
      route: "event",
      slugOrId: "launch-night",
      params: {},
    });
    expect(ticketivConsumerRouteFromDeepLink("ticketiv://tickets")).toEqual({
      route: "tickets",
      params: {},
    });
    expect(ticketivConsumerRouteFromDeepLink("ticketiv://account/settings")).toEqual({
      route: "account-settings",
      params: {},
    });
    expect(
      ticketivConsumerRouteFromDeepLink(
        "ticketiv://auth/callback?app=consumer&code=abc&next=/tickets"
      )
    ).toEqual({
      route: "auth-callback",
      nextPath: "/tickets",
      params: { app: "consumer", code: "abc", next: "/tickets" },
    });
  });

  it("marks matching checkout returns without accepting unrelated order returns", () => {
    const handoff = createTicketivCheckoutHandoff(hostedCheckout);
    const returned = completeTicketivCheckoutReturn(
      handoff,
      "ticketiv://checkout/return?orderId=order-1&paymentAttemptId=attempt-1&next=/orders/order-1/confirmation",
      "2026-07-18T19:12:00.000Z"
    );

    expect(returned).toMatchObject({
      status: "returned",
      returnedAt: "2026-07-18T19:12:00.000Z",
      nextPath: "/orders/order-1/confirmation",
    });

    expect(
      completeTicketivCheckoutReturn(
        handoff,
        "ticketiv://checkout/return?orderId=other-order"
      )
    ).toBe(handoff);
    expect(
      completeTicketivCheckoutReturn(handoff, "ticketiv://checkout/return")
    ).toBe(handoff);
  });

  it("saves, restores, clears and rejects corrupt handoff snapshots", async () => {
    const storage = new MemorySecureStorage();
    const handoff = createTicketivCheckoutHandoff(hostedCheckout);

    await saveTicketivCheckoutHandoff(storage, handoff);
    expect(await loadTicketivCheckoutHandoff(storage)).toMatchObject({
      orderId: "order-1",
      status: "pending",
    });

    await clearTicketivCheckoutHandoff(storage);
    expect(await loadTicketivCheckoutHandoff(storage)).toBeNull();

    await storage.setItem(TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY, "{bad json");
    expect(parseTicketivCheckoutHandoff("{bad json")).toEqual({
      ok: false,
      error: "invalid_json",
    });

    await storage.setItem(
      TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY,
      JSON.stringify({ schemaVersion: 2 })
    );
    expect(await loadTicketivCheckoutHandoff(storage)).toBeNull();
    expect(parseTicketivCheckoutHandoff(JSON.stringify({ schemaVersion: 2 }))).toEqual({
      ok: false,
      error: "unsupported_version",
    });
  });

  it("can mark a pending handoff as cancelled for browser dismissals", () => {
    expect(
      cancelTicketivCheckoutHandoff(
        createTicketivCheckoutHandoff(hostedCheckout),
        "2026-07-18T19:13:00.000Z"
      )
    ).toMatchObject({
      status: "cancelled",
      returnedAt: "2026-07-18T19:13:00.000Z",
    });
  });
});
