import type {
  BrowserSessionAdapter,
  SecureStorageAdapter,
} from "@ticketiv/adapters";
import {
  normalizeAppPath,
  parseTicketivDeepLink,
  type ParsedDeepLinkParams,
} from "@ticketiv/shared";
import { TICKETIV_SCHEME } from "./app-config";

export const TICKETIV_CHECKOUT_HANDOFF_SCHEMA_VERSION = 1;
export const TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY =
  "ticketiv.consumer.checkout-handoff.v1";

export type TicketivCheckoutHandoffStatus =
  | "pending"
  | "returned"
  | "cancelled";

export type TicketivHostedCheckoutInput = {
  checkoutUrl: string;
  orderId: string;
  paymentAttemptId?: string | null;
  provider?: string | null;
  nextPath?: string | null;
  startedAt?: string | null;
};

export type TicketivCheckoutHandoffState = {
  schemaVersion: typeof TICKETIV_CHECKOUT_HANDOFF_SCHEMA_VERSION;
  checkoutUrl: string;
  callbackUrl: string;
  orderId: string;
  paymentAttemptId: string | null;
  provider: string | null;
  nextPath: string | null;
  status: TicketivCheckoutHandoffStatus;
  startedAt: string;
  returnedAt: string | null;
};

export type TicketivCheckoutReturnRoute = {
  route: "checkout-return";
  orderId: string | null;
  paymentAttemptId: string | null;
  status: string | null;
  nextPath: string | null;
  params: ParsedDeepLinkParams;
};

export type TicketivConsumerCheckoutDeepLinkRoute =
  | TicketivCheckoutReturnRoute
  | { route: "ticket-token"; token: string; params: ParsedDeepLinkParams }
  | { route: "event"; slugOrId: string; params: ParsedDeepLinkParams }
  | { route: "tickets"; params: ParsedDeepLinkParams }
  | { route: "auth-callback"; nextPath: string | null; params: ParsedDeepLinkParams }
  | { route: "account-settings"; params: ParsedDeepLinkParams }
  | { route: "unknown"; path: string; params: ParsedDeepLinkParams };

export type TicketivCheckoutHandoffParseResult =
  | { ok: true; state: TicketivCheckoutHandoffState }
  | {
      ok: false;
      error: "empty" | "invalid_json" | "unsupported_version" | "invalid_shape";
    };

export function createTicketivCheckoutHandoff(
  input: TicketivHostedCheckoutInput
): TicketivCheckoutHandoffState {
  const checkoutUrl = normalizeCheckoutUrl(input.checkoutUrl);
  const orderId = requireValue(input.orderId, "Order id is required");
  const paymentAttemptId = normalizeNullable(input.paymentAttemptId);
  const nextPath = normalizeAppPath(input.nextPath ?? "/tickets");

  return {
    schemaVersion: TICKETIV_CHECKOUT_HANDOFF_SCHEMA_VERSION,
    checkoutUrl,
    callbackUrl: buildTicketivCheckoutReturnLink({
      orderId,
      paymentAttemptId,
      nextPath,
    }),
    orderId,
    paymentAttemptId,
    provider: normalizeNullable(input.provider),
    nextPath,
    status: "pending",
    startedAt: normalizeNullable(input.startedAt) ?? new Date().toISOString(),
    returnedAt: null,
  };
}

export async function startTicketivHostedCheckout(
  browserSession: BrowserSessionAdapter,
  input: TicketivHostedCheckoutInput,
  storage?: SecureStorageAdapter | null
): Promise<TicketivCheckoutHandoffState> {
  const handoff = createTicketivCheckoutHandoff(input);
  if (storage) await saveTicketivCheckoutHandoff(storage, handoff);

  await browserSession.openSession({
    url: handoff.checkoutUrl,
    callbackUrl: handoff.callbackUrl,
    presentation: "custom_tab",
    prefersEphemeralSession: false,
  });

  return handoff;
}

export function buildTicketivCheckoutReturnLink(input: {
  orderId: string;
  paymentAttemptId?: string | null;
  status?: string | null;
  nextPath?: string | null;
}): string {
  const url = new URL(`${TICKETIV_SCHEME}://checkout/return`);
  url.searchParams.set("orderId", requireValue(input.orderId, "Order id is required"));

  const paymentAttemptId = normalizeNullable(input.paymentAttemptId);
  if (paymentAttemptId) url.searchParams.set("paymentAttemptId", paymentAttemptId);

  const status = normalizeNullable(input.status);
  if (status) url.searchParams.set("status", status);

  const nextPath = normalizeAppPath(input.nextPath);
  if (nextPath) url.searchParams.set("next", nextPath);

  return url.toString();
}

export function ticketivConsumerRouteFromDeepLink(
  deepLink: string
): TicketivConsumerCheckoutDeepLinkRoute {
  const parsed = parseTicketivDeepLink(deepLink);

  if (parsed.kind === "ticket") {
    return { route: "ticket-token", token: parsed.token, params: parsed.params };
  }

  if (parsed.kind === "event") {
    return { route: "event", slugOrId: parsed.slugOrId, params: parsed.params };
  }

  if (parsed.kind === "auth-callback") {
    return {
      route: "auth-callback",
      nextPath: parsed.nextPath,
      params: parsed.params,
    };
  }

  if (parsed.kind === "account-settings") {
    return { route: "account-settings", params: parsed.params };
  }

  if (parsed.kind === "unknown" && parsed.path === "/tickets") {
    return { route: "tickets", params: parsed.params };
  }

  const checkoutReturn = checkoutReturnFromUnknownRoute(parsed);
  if (checkoutReturn) return checkoutReturn;

  return {
    route: "unknown",
    path: parsed.kind === "unknown" ? parsed.path : "",
    params: parsed.params,
  };
}

export function completeTicketivCheckoutReturn(
  state: TicketivCheckoutHandoffState,
  deepLink: string,
  returnedAt = new Date().toISOString()
): TicketivCheckoutHandoffState {
  const route = ticketivConsumerRouteFromDeepLink(deepLink);
  if (route.route !== "checkout-return") return state;

  const sameOrder = route.orderId === state.orderId;
  const sameAttempt =
    !route.paymentAttemptId ||
    !state.paymentAttemptId ||
    route.paymentAttemptId === state.paymentAttemptId;

  if (!sameOrder || !sameAttempt) return state;

  return {
    ...state,
    status: "returned",
    returnedAt,
    nextPath: route.nextPath ?? state.nextPath,
  };
}

export function cancelTicketivCheckoutHandoff(
  state: TicketivCheckoutHandoffState,
  returnedAt = new Date().toISOString()
): TicketivCheckoutHandoffState {
  return {
    ...state,
    status: "cancelled",
    returnedAt,
  };
}

export function serializeTicketivCheckoutHandoff(
  state: TicketivCheckoutHandoffState
): string {
  return JSON.stringify(state);
}

export function parseTicketivCheckoutHandoff(
  value: string | null | undefined
): TicketivCheckoutHandoffParseResult {
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
    record.schemaVersion !== TICKETIV_CHECKOUT_HANDOFF_SCHEMA_VERSION
  ) {
    return { ok: false, error: "unsupported_version" };
  }

  if (!isTicketivCheckoutHandoffState(parsed)) {
    return { ok: false, error: "invalid_shape" };
  }

  return { ok: true, state: parsed };
}

export async function saveTicketivCheckoutHandoff(
  storage: SecureStorageAdapter,
  state: TicketivCheckoutHandoffState,
  key = TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY
): Promise<void> {
  await storage.setItem(key, serializeTicketivCheckoutHandoff(state));
}

export async function loadTicketivCheckoutHandoff(
  storage: SecureStorageAdapter,
  key = TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY
): Promise<TicketivCheckoutHandoffState | null> {
  const parsed = parseTicketivCheckoutHandoff(await storage.getItem(key));
  return parsed.ok ? parsed.state : null;
}

export async function clearTicketivCheckoutHandoff(
  storage: SecureStorageAdapter,
  key = TICKETIV_CHECKOUT_HANDOFF_STORAGE_KEY
): Promise<void> {
  await storage.removeItem(key);
}

function checkoutReturnFromUnknownRoute(
  parsed: ReturnType<typeof parseTicketivDeepLink>
): TicketivCheckoutReturnRoute | null {
  if (parsed.kind !== "unknown") return null;

  const segments = parsed.path.split("/").filter(Boolean);
  if (segments[0] === "checkout" && segments[1] === "return") {
    return {
      route: "checkout-return",
      orderId: normalizeNullable(parsed.params.orderId),
      paymentAttemptId: normalizeNullable(
        parsed.params.paymentAttemptId ?? parsed.params.paymentId
      ),
      status: normalizeNullable(parsed.params.status),
      nextPath: normalizeAppPath(parsed.params.next),
      params: parsed.params,
    };
  }

  if (segments[0] === "orders" && segments[1] && segments[2] === "confirmation") {
    return {
      route: "checkout-return",
      orderId: segments[1],
      paymentAttemptId: normalizeNullable(
        parsed.params.paymentAttemptId ?? parsed.params.paymentId
      ),
      status: normalizeNullable(parsed.params.status),
      nextPath: `/orders/${segments[1]}/confirmation`,
      params: parsed.params,
    };
  }

  return null;
}

function isTicketivCheckoutHandoffState(
  value: unknown
): value is TicketivCheckoutHandoffState {
  const record = asRecord(value);
  if (!record) return false;

  return (
    record.schemaVersion === TICKETIV_CHECKOUT_HANDOFF_SCHEMA_VERSION &&
    typeof record.checkoutUrl === "string" &&
    typeof record.callbackUrl === "string" &&
    typeof record.orderId === "string" &&
    isNullableString(record.paymentAttemptId) &&
    isNullableString(record.provider) &&
    isNullableString(record.nextPath) &&
    typeof record.status === "string" &&
    ["pending", "returned", "cancelled"].includes(record.status) &&
    typeof record.startedAt === "string" &&
    isNullableString(record.returnedAt)
  );
}

function normalizeCheckoutUrl(value: string): string {
  const raw = requireValue(value, "Checkout URL is required");
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Checkout URL must be a valid HTTPS URL");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Checkout URL must use HTTPS");
  }

  return parsed.toString();
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
