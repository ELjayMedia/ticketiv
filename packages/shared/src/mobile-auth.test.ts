import { describe, expect, it } from "vitest";

import {
  buildMobileAuthRedirectUri,
  normalizeAppPath,
  parseTicketivDeepLink,
} from "./mobile-auth";

describe("mobile auth and deep links", () => {
  it("builds app-scoped auth callback URLs", () => {
    expect(
      buildMobileAuthRedirectUri({
        scheme: "ticketiv",
        app: "consumer",
        intent: "magic-link",
        nextPath: "/tickets",
      })
    ).toBe("ticketiv://auth/callback?app=consumer&intent=magic-link&next=%2Ftickets");
  });

  it("parses custom-scheme auth callbacks", () => {
    expect(
      parseTicketivDeepLink(
        "ticketiv-access://auth/callback?app=access&code=abc123&next=/scan/setup"
      )
    ).toMatchObject({
      kind: "auth-callback",
      app: "access",
      code: "abc123",
      nextPath: "/scan/setup",
    });
  });

  it("parses production web ticket links", () => {
    expect(parseTicketivDeepLink("https://ticketiv.app/t/order-token")).toMatchObject({
      kind: "ticket",
      token: "order-token",
    });
  });

  it("rejects untrusted web hosts", () => {
    expect(parseTicketivDeepLink("https://example.com/t/order-token")).toMatchObject({
      kind: "unknown",
      path: "/t/order-token",
    });
  });

  it("normalizes safe app paths", () => {
    expect(normalizeAppPath("tickets")).toBe("/tickets");
    expect(normalizeAppPath("https://ticketiv.app/events/test?ref=push")).toBe(
      "/events/test?ref=push"
    );
    expect(normalizeAppPath("//example.com/path")).toBeNull();
  });
});
