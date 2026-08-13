import { TICKETIV_PUBLIC_ORIGIN } from "./discovery";
import {
  createTicketivWalletState,
  createTicketivWalletTicket,
  type TicketivWalletState,
  type TicketivWalletTicket,
  type TicketivWalletTicketInput,
  type TicketivWalletTicketStatus,
} from "./ticket-wallet";

const TICKET_STATUSES = new Set<TicketivWalletTicketStatus>([
  "pending",
  "issued",
  "checked_in",
  "transferred",
  "revoked",
  "refunded",
]);

export class TicketivTicketDeliveryError extends Error {
  constructor(
    message: string,
    readonly code: "expired" | "invalid" | "unavailable" | "invalid_response"
  ) {
    super(message);
    this.name = "TicketivTicketDeliveryError";
  }
}

export type TicketivTicketDelivery = {
  expiresAt: string;
  syncedAt: string;
  ticket: TicketivWalletTicket;
};

type TicketivTicketDeliveryResponse = {
  expiresAt: unknown;
  syncedAt: unknown;
  ticket: unknown;
};

export async function fetchTicketivTicketDelivery(
  token: string,
  fetcher: typeof fetch = fetch,
  origin = TICKETIV_PUBLIC_ORIGIN
): Promise<TicketivTicketDelivery> {
  const normalizedToken = token.trim();
  if (!normalizedToken) {
    throw new TicketivTicketDeliveryError(
      "Ticket delivery link is missing its token.",
      "invalid"
    );
  }

  let response: Response;
  try {
    response = await fetcher(
      `${origin}/api/mobile/tickets/${encodeURIComponent(normalizedToken)}`,
      { headers: { Accept: "application/json" } }
    );
  } catch {
    throw new TicketivTicketDeliveryError(
      "Ticket delivery is unavailable right now.",
      "unavailable"
    );
  }

  if (!response.ok) {
    if (response.status === 410) {
      throw new TicketivTicketDeliveryError("This ticket link has expired.", "expired");
    }
    if (response.status === 404) {
      throw new TicketivTicketDeliveryError(
        "This ticket link is no longer valid.",
        "invalid"
      );
    }
    throw new TicketivTicketDeliveryError(
      "Ticket delivery is unavailable right now.",
      "unavailable"
    );
  }

  let payload: TicketivTicketDeliveryResponse;
  try {
    payload = (await response.json()) as TicketivTicketDeliveryResponse;
  } catch {
    throw invalidResponse("Ticket delivery response is invalid.");
  }
  const record = asRecord(payload.ticket);
  const syncedAt = requireIsoDate(payload.syncedAt, "Ticket sync time is invalid.");
  const expiresAt = requireIsoDate(payload.expiresAt, "Ticket expiry is invalid.");
  if (!record) throw invalidResponse("Ticket delivery response is invalid.");
  if (!TICKET_STATUSES.has(record.status as TicketivWalletTicketStatus)) {
    throw invalidResponse("Ticket delivery status is invalid.");
  }

  let ticket: TicketivWalletTicket;
  try {
    ticket = createTicketivWalletTicket({
      ...(record as TicketivWalletTicketInput),
      deliveryToken: normalizedToken,
      offlineExpiresAt: expiresAt,
      updatedAt: syncedAt,
    });
  } catch (error) {
    throw invalidResponse(error instanceof Error ? error.message : "Ticket delivery response is invalid.");
  }

  return {
    expiresAt,
    syncedAt,
    ticket,
  };
}

export function canUseCachedTicketivTicketDelivery(error: unknown): boolean {
  return error instanceof TicketivTicketDeliveryError && error.code === "unavailable";
}

export function importTicketivTicketDelivery(
  wallet: TicketivWalletState,
  delivery: TicketivTicketDelivery
): TicketivWalletState {
  return createTicketivWalletState({
    syncedAt: delivery.syncedAt,
    tickets: [
      delivery.ticket,
      ...wallet.tickets.filter((ticket) => ticket.id !== delivery.ticket.id),
    ],
  });
}

export function findTicketivWalletTicketByDeliveryToken(
  wallet: TicketivWalletState,
  token: string
): TicketivWalletTicket | null {
  return wallet.tickets.find((ticket) => ticket.deliveryToken === token) ?? null;
}

function requireIsoDate(value: unknown, message: string): string {
  if (typeof value !== "string" || Number.isNaN(new Date(value).getTime())) {
    throw invalidResponse(message);
  }
  return value;
}

function invalidResponse(message: string): TicketivTicketDeliveryError {
  return new TicketivTicketDeliveryError(message, "invalid_response");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
