"use client";

export interface OfflineTicketState {
  available: boolean;
  savedAt?: string;
  expiresAt?: string;
}

interface OfflineTicketReply extends OfflineTicketState {
  ok: boolean;
  error?: string;
}

const MESSAGE_TIMEOUT_MS = 12_000;

function workerFor(registration: ServiceWorkerRegistration): ServiceWorker | null {
  return registration.active ?? registration.waiting ?? registration.installing;
}

async function sendMessage(message: Record<string, unknown>): Promise<OfflineTicketReply> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, available: false, error: "Offline tickets are not supported on this device." };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
    const worker = workerFor(registration);
    if (!worker) {
      return { ok: false, available: false, error: "Offline ticket service is not ready yet." };
    }

    return await new Promise<OfflineTicketReply>((resolve) => {
      const channel = new MessageChannel();
      const timer = window.setTimeout(() => {
        channel.port1.close();
        resolve({ ok: false, available: false, error: "Saving took too long. Please try again." });
      }, MESSAGE_TIMEOUT_MS);

      channel.port1.onmessage = (event: MessageEvent<OfflineTicketReply>) => {
        window.clearTimeout(timer);
        channel.port1.close();
        resolve(event.data);
      };
      worker.postMessage(message, [channel.port2]);
    });
  } catch {
    return { ok: false, available: false, error: "This ticket could not be saved on this device." };
  }
}

function staticAssetsOnPage(): string[] {
  if (typeof performance === "undefined") return [];

  const urls = performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((value) => {
      try {
        const url = new URL(value);
        return url.origin === window.location.origin && url.pathname.startsWith("/_next/static/");
      } catch {
        return false;
      }
    });

  return [...new Set(urls)].slice(0, 80);
}

export function getOfflineTicketState(input: {
  ticketId: string;
  ownerId: string;
}): Promise<OfflineTicketReply> {
  return sendMessage({ type: "GET_OFFLINE_TICKET", ...input });
}

export function saveTicketForOffline(input: {
  ticketId: string;
  ownerId: string;
  expiresAt: string;
  siblingIds?: string[];
}): Promise<OfflineTicketReply> {
  const ticketIds = [...new Set([input.ticketId, ...(input.siblingIds ?? [])])];
  return sendMessage({
    type: "SAVE_OFFLINE_TICKET",
    ...input,
    ticketIds,
    url: window.location.href,
    assetUrls: staticAssetsOnPage(),
  });
}

export function removeOfflineTicket(input: {
  ticketId: string;
  ownerId: string;
  siblingIds?: string[];
}): Promise<OfflineTicketReply> {
  const ticketIds = [...new Set([input.ticketId, ...(input.siblingIds ?? [])])];
  return sendMessage({ type: "REMOVE_OFFLINE_TICKET", ...input, ticketIds });
}
