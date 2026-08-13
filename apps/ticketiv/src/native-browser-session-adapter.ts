import type { BrowserSessionAdapter } from "@ticketiv/adapters";

export type TicketivBrowserSessionBridge = {
  openSession(
    url: string,
    prefersEphemeralSession: boolean,
    allowExternalRedirects: boolean
  ): Promise<void>;
};

export function isTicketivBrowserSessionBridge(
  value: unknown
): value is TicketivBrowserSessionBridge {
  if (!value || typeof value !== "object") return false;
  return typeof (value as Partial<TicketivBrowserSessionBridge>).openSession === "function";
}

export function createTicketivBrowserSessionAdapter(
  bridge: TicketivBrowserSessionBridge
): BrowserSessionAdapter {
  return {
    async openSession(input) {
      const url = new URL(input.url);
      if (url.protocol !== "https:") {
        throw new Error("Browser session URL must use HTTPS");
      }

      await bridge.openSession(
        url.toString(),
        input.prefersEphemeralSession === true,
        Boolean(input.callbackUrl),
      );
    },
  };
}
