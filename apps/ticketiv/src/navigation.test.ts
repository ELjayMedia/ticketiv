import { describe, expect, it } from "vitest";

import {
  applyTicketivConsumerDeepLink,
  createTicketivConsumerAppShellState,
} from "./app-shell";
import {
  TICKETIV_CONSUMER_NAV_ITEMS,
  isTicketivConsumerFocusedRoute,
  ticketivConsumerRouteForSection,
  ticketivConsumerSectionForRoute,
} from "./navigation";

describe("Ticketiv native attendee navigation", () => {
  it("matches the mobile web tab language and order", () => {
    expect(TICKETIV_CONSUMER_NAV_ITEMS).toEqual([
      { key: "discover", label: "Discover" },
      { key: "tickets", label: "Tickets" },
      { key: "friends", label: "Friends" },
      { key: "you", label: "You" },
    ]);
  });

  it("gives every native tab a deterministic destination", () => {
    expect(ticketivConsumerRouteForSection("discover")).toEqual({
      route: "discover",
    });
    expect(ticketivConsumerRouteForSection("tickets")).toEqual({
      route: "tickets",
    });
    expect(ticketivConsumerRouteForSection("friends")).toEqual({
      route: "unknown",
      path: "/friends",
    });
    expect(ticketivConsumerRouteForSection("you")).toEqual({
      route: "unknown",
      path: "/me",
    });
  });

  it("selects the correct tab for deep-linked attendee destinations", () => {
    const shell = createTicketivConsumerAppShellState();

    expect(
      ticketivConsumerSectionForRoute(
        applyTicketivConsumerDeepLink(
          shell,
          "https://ticketiv.app/friends/invites"
        ).activeRoute
      )
    ).toBe("friends");
    expect(
      ticketivConsumerSectionForRoute(
        applyTicketivConsumerDeepLink(
          shell,
          "ticketiv://notifications"
        ).activeRoute
      )
    ).toBe("you");
    expect(
      ticketivConsumerSectionForRoute({
        route: "account-settings",
      })
    ).toBe("you");
    expect(
      ticketivConsumerSectionForRoute({
        route: "ticket-token",
        token: "delivery-token",
      })
    ).toBe("tickets");
    expect(
      ticketivConsumerSectionForRoute({
        route: "ticket",
        ticketId: "ticket-1",
      })
    ).toBe("tickets");
    expect(
      ticketivConsumerSectionForRoute({
        route: "order-confirmation",
        orderId: "order-1",
      })
    ).toBe("tickets");
  });

  it("suppresses global tabs only during focused attendee flows", () => {
    expect(
      isTicketivConsumerFocusedRoute({
        route: "checkout",
        orderId: "order-1",
        status: "pending",
      })
    ).toBe(true);
    expect(
      isTicketivConsumerFocusedRoute({
        route: "ticket",
        ticketId: "ticket-1",
      })
    ).toBe(true);
    expect(
      isTicketivConsumerFocusedRoute({
        route: "unknown",
        path: "/tickets/ticket-1/transfer",
      })
    ).toBe(true);
    expect(
      isTicketivConsumerFocusedRoute({
        route: "unknown",
        path: "/tickets/ticket-1/qr",
      })
    ).toBe(true);
    expect(
      isTicketivConsumerFocusedRoute({
        route: "unknown",
        path: "/refund-policy",
      })
    ).toBe(false);
    expect(
      isTicketivConsumerFocusedRoute({
        route: "unknown",
        path: "/payments",
      })
    ).toBe(false);
  });
});
