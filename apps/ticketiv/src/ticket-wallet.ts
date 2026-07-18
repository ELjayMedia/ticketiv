import {
  type Currency,
  formatEventDate,
  formatPriceLabel,
  formatTimeRange,
  parseTicketivDeepLink,
  type SecureStorageAdapter,
} from "@ticketiv/shared";

export const TICKETIV_WALLET_SCHEMA_VERSION = 1;
export const TICKETIV_WALLET_STORAGE_KEY = "ticketiv.consumer.wallet.v1";

export type TicketivWalletTicketStatus =
  | "pending"
  | "issued"
  | "checked_in"
  | "transferred"
  | "revoked"
  | "refunded";

export type TicketivWalletTicket = {
  id: string;
  orderId: string;
  eventId: string;
  eventTitle: string;
  eventSlug: string | null;
  ticketCode: string;
  deliveryToken: string | null;
  ticketTypeName: string | null;
  holderName: string | null;
  eventStartsAt: string | null;
  venueName: string | null;
  venueAddress: string | null;
  coverImageUrl: string | null;
  status: TicketivWalletTicketStatus;
  checkedInAt: string | null;
  revokedAt: string | null;
  refundedAt: string | null;
  priceCents: number | null;
  currency: Currency;
  updatedAt: string;
};

export type TicketivWalletTicketInput = Omit<
  TicketivWalletTicket,
  "currency" | "status" | "updatedAt"
> & {
  currency?: string | null;
  status?: TicketivWalletTicketStatus | null;
  updatedAt?: string | null;
};

export type TicketivWalletState = {
  schemaVersion: typeof TICKETIV_WALLET_SCHEMA_VERSION;
  syncedAt: string | null;
  tickets: TicketivWalletTicket[];
};

export type TicketivWalletSummary = {
  total: number;
  validForEntry: number;
  upcoming: number;
  past: number;
  needsSync: boolean;
};

export type TicketivWalletParseResult =
  | { ok: true; wallet: TicketivWalletState }
  | { ok: false; error: "empty" | "invalid_json" | "unsupported_version" | "invalid_shape" };

const STATUSES = new Set<TicketivWalletTicketStatus>([
  "pending",
  "issued",
  "checked_in",
  "transferred",
  "revoked",
  "refunded",
]);

const CURRENCIES = new Set<Currency>(["SZL", "ZAR", "USD", "EUR", "GBP"]);

export function createTicketivWalletState(input: {
  tickets?: TicketivWalletTicket[];
  syncedAt?: string | null;
} = {}): TicketivWalletState {
  return {
    schemaVersion: TICKETIV_WALLET_SCHEMA_VERSION,
    syncedAt: normalizeNullable(input.syncedAt),
    tickets: sortTickets(uniqueTickets(input.tickets ?? [])),
  };
}

export function createTicketivWalletTicket(
  input: TicketivWalletTicketInput
): TicketivWalletTicket {
  return {
    id: requireValue(input.id, "Ticket id is required"),
    orderId: requireValue(input.orderId, "Order id is required"),
    eventId: requireValue(input.eventId, "Event id is required"),
    eventTitle: requireValue(input.eventTitle, "Event title is required"),
    eventSlug: normalizeNullable(input.eventSlug),
    ticketCode: requireValue(input.ticketCode, "Ticket QR code is required"),
    deliveryToken: normalizeNullable(input.deliveryToken),
    ticketTypeName: normalizeNullable(input.ticketTypeName),
    holderName: normalizeNullable(input.holderName),
    eventStartsAt: normalizeNullable(input.eventStartsAt),
    venueName: normalizeNullable(input.venueName),
    venueAddress: normalizeNullable(input.venueAddress),
    coverImageUrl: normalizeNullable(input.coverImageUrl),
    status: input.status ?? "issued",
    checkedInAt: normalizeNullable(input.checkedInAt),
    revokedAt: normalizeNullable(input.revokedAt),
    refundedAt: normalizeNullable(input.refundedAt),
    priceCents: typeof input.priceCents === "number" ? Math.max(0, Math.floor(input.priceCents)) : null,
    currency: normalizeCurrency(input.currency),
    updatedAt: normalizeNullable(input.updatedAt) ?? new Date().toISOString(),
  };
}

export function upsertTicketivWalletTicket(
  wallet: TicketivWalletState,
  ticket: TicketivWalletTicket
): TicketivWalletState {
  return createTicketivWalletState({
    syncedAt: wallet.syncedAt,
    tickets: [ticket, ...wallet.tickets.filter((item) => item.id !== ticket.id)],
  });
}

export function removeTicketivWalletTicket(
  wallet: TicketivWalletState,
  ticketId: string
): TicketivWalletState {
  return createTicketivWalletState({
    syncedAt: wallet.syncedAt,
    tickets: wallet.tickets.filter((ticket) => ticket.id !== ticketId),
  });
}

export function findTicketivWalletTicket(
  wallet: TicketivWalletState,
  ticketId: string
): TicketivWalletTicket | null {
  return wallet.tickets.find((ticket) => ticket.id === ticketId) ?? null;
}

export function isTicketivWalletTicketValidForEntry(
  ticket: TicketivWalletTicket
): boolean {
  return ticket.status === "issued" && !ticket.checkedInAt && !ticket.revokedAt && !ticket.refundedAt;
}

export function qrPayloadForTicketivWalletTicket(
  ticket: TicketivWalletTicket
): string | null {
  return isTicketivWalletTicketValidForEntry(ticket) ? ticket.ticketCode : null;
}

export function describeTicketivWalletTicket(ticket: TicketivWalletTicket): {
  title: string;
  whenLabel: string;
  venueLabel: string;
  priceLabel: string;
  deepLink: string;
} {
  const start = ticket.eventStartsAt ? new Date(ticket.eventStartsAt) : null;

  return {
    title: ticket.eventTitle,
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date TBA",
    venueLabel: ticket.venueName ?? "Venue TBA",
    priceLabel: formatPriceLabel(ticket.priceCents, ticket.currency),
    deepLink: buildTicketivWalletTicketLink(ticket),
  };
}

export function buildTicketivWalletTicketLink(ticket: TicketivWalletTicket): string {
  return ticket.deliveryToken
    ? `ticketiv://t/${encodeURIComponent(ticket.deliveryToken)}`
    : `ticketiv://tickets/${encodeURIComponent(ticket.id)}`;
}

export function ticketivWalletRouteFromDeepLink(deepLink: string):
  | { route: "ticket-token"; token: string }
  | { route: "event"; slugOrId: string }
  | { route: "tickets" }
  | { route: "unknown" } {
  const parsed = parseTicketivDeepLink(deepLink);

  if (parsed.kind === "ticket") return { route: "ticket-token", token: parsed.token };
  if (parsed.kind === "event") return { route: "event", slugOrId: parsed.slugOrId };
  if (parsed.kind === "unknown" && parsed.path === "/tickets") return { route: "tickets" };
  return { route: "unknown" };
}

export function summarizeTicketivWallet(
  wallet: TicketivWalletState,
  now = Date.now()
): TicketivWalletSummary {
  const visible = wallet.tickets.filter((ticket) => ticket.status !== "pending");

  return {
    total: visible.length,
    validForEntry: visible.filter(isTicketivWalletTicketValidForEntry).length,
    upcoming: visible.filter((ticket) => !isPast(ticket, now)).length,
    past: visible.filter((ticket) => isPast(ticket, now)).length,
    needsSync: wallet.syncedAt === null,
  };
}

export function serializeTicketivWallet(wallet: TicketivWalletState): string {
  return JSON.stringify(createTicketivWalletState(wallet));
}

export function parseTicketivWallet(
  value: string | null | undefined
): TicketivWalletParseResult {
  if (!value) return { ok: false, error: "empty" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  const record = asRecord(parsed);
  if (
    record &&
    typeof record.schemaVersion === "number" &&
    record.schemaVersion !== TICKETIV_WALLET_SCHEMA_VERSION
  ) {
    return { ok: false, error: "unsupported_version" };
  }

  if (!isTicketivWalletState(parsed)) {
    return { ok: false, error: "invalid_shape" };
  }

  return { ok: true, wallet: createTicketivWalletState(parsed) };
}

export async function saveTicketivWallet(
  storage: SecureStorageAdapter,
  wallet: TicketivWalletState,
  key = TICKETIV_WALLET_STORAGE_KEY
): Promise<void> {
  await storage.setItem(key, serializeTicketivWallet(wallet));
}

export async function loadTicketivWallet(
  storage: SecureStorageAdapter,
  key = TICKETIV_WALLET_STORAGE_KEY
): Promise<TicketivWalletState | null> {
  const parsed = parseTicketivWallet(await storage.getItem(key));
  return parsed.ok ? parsed.wallet : null;
}

export async function clearTicketivWallet(
  storage: SecureStorageAdapter,
  key = TICKETIV_WALLET_STORAGE_KEY
): Promise<void> {
  await storage.removeItem(key);
}

function isTicketivWalletState(value: unknown): value is TicketivWalletState {
  const record = asRecord(value);
  if (!record) return false;

  return (
    record.schemaVersion === TICKETIV_WALLET_SCHEMA_VERSION &&
    isNullableString(record.syncedAt) &&
    Array.isArray(record.tickets) &&
    record.tickets.every(isTicketivWalletTicket)
  );
}

function isTicketivWalletTicket(value: unknown): value is TicketivWalletTicket {
  const record = asRecord(value);
  if (!record) return false;

  return (
    typeof record.id === "string" &&
    typeof record.orderId === "string" &&
    typeof record.eventId === "string" &&
    typeof record.eventTitle === "string" &&
    isNullableString(record.eventSlug) &&
    typeof record.ticketCode === "string" &&
    isNullableString(record.deliveryToken) &&
    isNullableString(record.ticketTypeName) &&
    isNullableString(record.holderName) &&
    isNullableString(record.eventStartsAt) &&
    isNullableString(record.venueName) &&
    isNullableString(record.venueAddress) &&
    isNullableString(record.coverImageUrl) &&
    typeof record.status === "string" &&
    STATUSES.has(record.status as TicketivWalletTicketStatus) &&
    isNullableString(record.checkedInAt) &&
    isNullableString(record.revokedAt) &&
    isNullableString(record.refundedAt) &&
    (record.priceCents === null || typeof record.priceCents === "number") &&
    typeof record.currency === "string" &&
    CURRENCIES.has(record.currency as Currency) &&
    typeof record.updatedAt === "string"
  );
}

function uniqueTickets(tickets: TicketivWalletTicket[]): TicketivWalletTicket[] {
  const byId = new Map<string, TicketivWalletTicket>();
  for (const ticket of tickets) byId.set(ticket.id, ticket);
  return Array.from(byId.values());
}

function sortTickets(tickets: TicketivWalletTicket[]): TicketivWalletTicket[] {
  return [...tickets].sort((a, b) => {
    const ax = a.eventStartsAt ? new Date(a.eventStartsAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bx = b.eventStartsAt ? new Date(b.eventStartsAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (ax !== bx) return ax - bx;
    return a.eventTitle.localeCompare(b.eventTitle);
  });
}

function isPast(ticket: TicketivWalletTicket, now: number): boolean {
  return ticket.eventStartsAt ? new Date(ticket.eventStartsAt).getTime() < now : false;
}

function normalizeCurrency(value: string | null | undefined): Currency {
  const normalized = value?.trim().toUpperCase();
  return CURRENCIES.has(normalized as Currency) ? (normalized as Currency) : "SZL";
}

function requireValue(value: string | null | undefined, message: string): string {
  const normalized = normalizeNullable(value);
  if (!normalized) throw new Error(message);
  return normalized;
}

function normalizeNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
