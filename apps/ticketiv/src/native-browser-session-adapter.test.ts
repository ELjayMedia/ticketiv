import { describe, expect, it, vi } from "vitest";

import {
  createTicketivBrowserSessionAdapter,
  isTicketivBrowserSessionBridge,
} from "./native-browser-session-adapter";

describe("Ticketiv native browser-session adapter", () => {
  it("accepts only a complete native browser bridge", () => {
    expect(isTicketivBrowserSessionBridge(null)).toBe(false);
    expect(isTicketivBrowserSessionBridge({})).toBe(false);
    expect(isTicketivBrowserSessionBridge({ openSession: async () => undefined })).toBe(true);
  });

  it("opens normalized HTTPS URLs through the native browser", async () => {
    const openSession = vi.fn(async () => undefined);
    const adapter = createTicketivBrowserSessionAdapter({ openSession });

    await adapter.openSession({
      url: "https://ticketiv.app/events/launch-night",
      callbackUrl: "ticketiv://checkout/return",
      presentation: "custom_tab",
      prefersEphemeralSession: false,
    });

    expect(openSession).toHaveBeenCalledWith(
      "https://ticketiv.app/events/launch-night",
      false,
      true,
    );
  });

  it("keeps ordinary Ticketiv browsing inside the browser tab", async () => {
    const openSession = vi.fn(async () => undefined);
    const adapter = createTicketivBrowserSessionAdapter({ openSession });

    await adapter.openSession({
      url: "https://ticketiv.app/events/launch-night",
      presentation: "custom_tab",
    });

    expect(openSession).toHaveBeenCalledWith(
      "https://ticketiv.app/events/launch-night",
      false,
      false,
    );
  });

  it("rejects non-HTTPS URLs before invoking native code", async () => {
    const openSession = vi.fn(async () => undefined);
    const adapter = createTicketivBrowserSessionAdapter({ openSession });

    await expect(
      adapter.openSession({ url: "ticketiv://events/launch-night" })
    ).rejects.toThrow("Browser session URL must use HTTPS");
    expect(openSession).not.toHaveBeenCalled();
  });

  it("propagates native failures to the calling flow", async () => {
    const failure = new Error("no external browser");
    const adapter = createTicketivBrowserSessionAdapter({
      openSession: async () => {
        throw failure;
      },
    });

    await expect(
      adapter.openSession({ url: "https://ticketiv.app/tickets" })
    ).rejects.toBe(failure);
  });
});
