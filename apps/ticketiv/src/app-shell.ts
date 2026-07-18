import {
  MissingPlatformAdaptersError,
  type SecureStorageAdapter,
  type TicketivPlatformAdapters,
} from "@ticketiv/adapters";
import { normalizeAppPath } from "@ticketiv/shared";
import {
  cancelTicketivCheckoutHandoff,
  completeTicketivCheckoutReturn,
  loadTicketivCheckoutHandoff,
  saveTicketivCheckoutHandoff,
  startTicketivHostedCheckout,
  ticketivConsumerRouteFromDeepLink,
  type TicketivCheckoutHandoffState,
  type TicketivCheckoutHandoffStatus,
  type TicketivCheckoutReturnRoute,
  type TicketivHostedCheckoutInput,
} from "./checkout-handoff";
import {
  createTicketivWalletState,
  loadTicketivWallet,
  summarizeTicketivWallet,
  type TicketivWalletState,
  type TicketivWalletSummary,
} from "./ticket-wallet";

export type TicketivConsumerShellRoute =
  | { route: "discover" }
  | { route: "tickets" }
  | { route: "ticket-token"; token: string }
  | { route: "event"; slugOrId: string }
  | { route: "auth-callback"; nextPath: string | null }
  | { route: "account-settings" }
  | { route: "checkout"; orderId: string; status: TicketivCheckoutHandoffStatus }
  | { route: "checkout-return"; orderId: string | null; status: string | null }
  | { route: "order-confirmation"; orderId: string }
  | { route: "unknown"; path: string };

export type TicketivConsumerShellErrorCode =
  | "checkout-return-mismatch"
  | "browser-session-missing";

export type TicketivConsumerShellError = {
  code: TicketivConsumerShellErrorCode;
  message: string;
};

export type TicketivConsumerAppShellState = {
  activeRoute: TicketivConsumerShellRoute;
  wallet: TicketivWalletState;
  checkoutHandoff: TicketivCheckoutHandoffState | null;
  bootedAt: string;
  lastDeepLink: string | null;
  lastError: TicketivConsumerShellError | null;
};

export type CreateTicketivConsumerAppShellStateInput = {
  activeRoute?: TicketivConsumerShellRoute;
  wallet?: TicketivWalletState;
  checkoutHandoff?: TicketivCheckoutHandoffState | null;
  bootedAt?: string | null;
  lastDeepLink?: string | null;
  lastError?: TicketivConsumerShellError | null;
};

export type BootTicketivConsumerAppShellInput =
  CreateTicketivConsumerAppShellStateInput & {
    storage?: SecureStorageAdapter | null;
    initialUrl?: string | null;
  };

export type TicketivConsumerAppReadinessBlocker =
  | "secure-storage-missing"
  | "browser-session-missing"
  | "offline-wallet-empty"
  | "pending-checkout-return";

export type TicketivConsumerAppShellSummary = {
  route: TicketivConsumerShellRoute["route"];
  wallet: TicketivWalletSummary;
  checkoutStatus: TicketivCheckoutHandoffStatus | "none";
  canOpenHostedCheckout: boolean;
  canRenderOfflineQr: boolean;
  hasPendingCheckout: boolean;
  blockers: TicketivConsumerAppReadinessBlocker[];
};

export function createTicketivConsumerAppShellState(
  input: CreateTicketivConsumerAppShellStateInput = {}
): TicketivConsumerAppShellState {
  const wallet = input.wallet ?? createTicketivWalletState();
  const checkoutHandoff = input.checkoutHandoff ?? null;

  return {
    activeRoute: input.activeRoute ?? defaultRouteForState(wallet, checkoutHandoff),
    wallet,
    checkoutHandoff,
    bootedAt: input.bootedAt ?? new Date().toISOString(),
    lastDeepLink: input.lastDeepLink ?? null,
    lastError: input.lastError ?? null,
  };
}

export async function bootTicketivConsumerAppShell(
  input: BootTicketivConsumerAppShellInput = {}
): Promise<TicketivConsumerAppShellState> {
  const wallet =
    input.wallet ??
    (input.storage ? await loadTicketivWallet(input.storage) : null) ??
    createTicketivWalletState();
  const checkoutHandoff =
    input.checkoutHandoff !== undefined
      ? input.checkoutHandoff
      : input.storage
        ? await loadTicketivCheckoutHandoff(input.storage)
        : null;

  const state = createTicketivConsumerAppShellState({
    ...input,
    wallet,
    checkoutHandoff,
  });

  return input.initialUrl
    ? applyTicketivConsumerDeepLink(state, input.initialUrl, state.bootedAt)
    : state;
}

export function applyTicketivConsumerDeepLink(
  state: TicketivConsumerAppShellState,
  deepLink: string,
  handledAt = new Date().toISOString()
): TicketivConsumerAppShellState {
  const parsed = ticketivConsumerRouteFromDeepLink(deepLink);

  if (parsed.route === "checkout-return") {
    return applyCheckoutReturnDeepLink(state, parsed, deepLink, handledAt);
  }

  return {
    ...state,
    activeRoute: routeFromConsumerDeepLink(parsed),
    lastDeepLink: deepLink,
    lastError: null,
  };
}

export async function startTicketivConsumerHostedCheckout(
  state: TicketivConsumerAppShellState,
  adapters: Partial<Pick<TicketivPlatformAdapters, "browserSession" | "secureStorage">>,
  input: TicketivHostedCheckoutInput
): Promise<TicketivConsumerAppShellState> {
  if (!adapters.browserSession) {
    throw new MissingPlatformAdaptersError(["browserSession"]);
  }

  const handoff = await startTicketivHostedCheckout(
    adapters.browserSession,
    input,
    adapters.secureStorage
  );

  return {
    ...state,
    activeRoute: routeFromCheckoutHandoff(handoff),
    checkoutHandoff: handoff,
    lastError: null,
  };
}

export async function cancelTicketivConsumerCheckout(
  state: TicketivConsumerAppShellState,
  storage?: SecureStorageAdapter | null,
  cancelledAt = new Date().toISOString()
): Promise<TicketivConsumerAppShellState> {
  if (!state.checkoutHandoff) return state;

  const checkoutHandoff = cancelTicketivCheckoutHandoff(
    state.checkoutHandoff,
    cancelledAt
  );
  if (storage) await saveTicketivCheckoutHandoff(storage, checkoutHandoff);

  return {
    ...state,
    activeRoute: { route: "tickets" },
    checkoutHandoff,
    lastError: null,
  };
}

export function summarizeTicketivConsumerAppShell(
  state: TicketivConsumerAppShellState,
  adapters: Partial<Pick<TicketivPlatformAdapters, "browserSession" | "secureStorage">> = {},
  now = Date.now()
): TicketivConsumerAppShellSummary {
  const wallet = summarizeTicketivWallet(state.wallet, now);
  const checkoutStatus = state.checkoutHandoff?.status ?? "none";
  const hasPendingCheckout = checkoutStatus === "pending";
  const canOpenHostedCheckout = Boolean(adapters.browserSession);
  const canRenderOfflineQr = wallet.validForEntry > 0;
  const blockers: TicketivConsumerAppReadinessBlocker[] = [];

  if (!adapters.secureStorage) blockers.push("secure-storage-missing");
  if (!adapters.browserSession) blockers.push("browser-session-missing");
  if (!canRenderOfflineQr) blockers.push("offline-wallet-empty");
  if (hasPendingCheckout) blockers.push("pending-checkout-return");

  return {
    route: state.activeRoute.route,
    wallet,
    checkoutStatus,
    canOpenHostedCheckout,
    canRenderOfflineQr,
    hasPendingCheckout,
    blockers,
  };
}

function applyCheckoutReturnDeepLink(
  state: TicketivConsumerAppShellState,
  route: TicketivCheckoutReturnRoute,
  deepLink: string,
  handledAt: string
): TicketivConsumerAppShellState {
  if (!state.checkoutHandoff) {
    return {
      ...state,
      activeRoute: routeFromCheckoutReturn(route),
      lastDeepLink: deepLink,
      lastError: null,
    };
  }

  const checkoutHandoff = completeTicketivCheckoutReturn(
    state.checkoutHandoff,
    deepLink,
    handledAt
  );

  if (checkoutHandoff === state.checkoutHandoff) {
    return {
      ...state,
      lastDeepLink: deepLink,
      lastError: {
        code: "checkout-return-mismatch",
        message: "Checkout return did not match the pending order.",
      },
    };
  }

  return {
    ...state,
    activeRoute: routeFromCheckoutReturn(route),
    checkoutHandoff,
    lastDeepLink: deepLink,
    lastError: null,
  };
}

function routeFromConsumerDeepLink(
  route: ReturnType<typeof ticketivConsumerRouteFromDeepLink>
): TicketivConsumerShellRoute {
  if (route.route === "ticket-token") {
    return { route: "ticket-token", token: route.token };
  }

  if (route.route === "event") {
    return { route: "event", slugOrId: route.slugOrId };
  }

  if (route.route === "tickets") return { route: "tickets" };

  if (route.route === "auth-callback") {
    return { route: "auth-callback", nextPath: route.nextPath };
  }

  if (route.route === "account-settings") return { route: "account-settings" };

  if (route.route === "unknown") return routeFromAppPath(route.path);

  return routeFromCheckoutReturn(route);
}

function routeFromCheckoutReturn(
  route: TicketivCheckoutReturnRoute
): TicketivConsumerShellRoute {
  if (route.nextPath) return routeFromAppPath(route.nextPath);
  if (route.orderId) return { route: "order-confirmation", orderId: route.orderId };
  return { route: "checkout-return", orderId: route.orderId, status: route.status };
}

function routeFromAppPath(path: string): TicketivConsumerShellRoute {
  const normalized = normalizeAppPath(path) ?? "/";
  const segments = normalized.split("/").filter(Boolean);

  if (normalized === "/" || normalized === "/browse") return { route: "discover" };
  if (normalized === "/tickets") return { route: "tickets" };
  if (normalized === "/account/settings") return { route: "account-settings" };
  if (segments[0] === "t" && segments[1]) {
    return { route: "ticket-token", token: segments[1] };
  }
  if (segments[0] === "events" && segments[1]) {
    return { route: "event", slugOrId: segments[1] };
  }
  if (segments[0] === "orders" && segments[1] && segments[2] === "confirmation") {
    return { route: "order-confirmation", orderId: segments[1] };
  }

  return { route: "unknown", path: normalized };
}

function routeFromCheckoutHandoff(
  checkoutHandoff: TicketivCheckoutHandoffState
): TicketivConsumerShellRoute {
  return {
    route: "checkout",
    orderId: checkoutHandoff.orderId,
    status: checkoutHandoff.status,
  };
}

function defaultRouteForState(
  wallet: TicketivWalletState,
  checkoutHandoff: TicketivCheckoutHandoffState | null
): TicketivConsumerShellRoute {
  if (checkoutHandoff?.status === "pending") {
    return routeFromCheckoutHandoff(checkoutHandoff);
  }

  if (wallet.tickets.length > 0) return { route: "tickets" };
  return { route: "discover" };
}
