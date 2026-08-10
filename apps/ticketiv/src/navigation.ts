import type { TicketivConsumerShellRoute } from "./app-shell";

export type TicketivConsumerAppSection =
  | "discover"
  | "tickets"
  | "friends"
  | "you";

export const TICKETIV_CONSUMER_NAV_ITEMS: ReadonlyArray<{
  key: TicketivConsumerAppSection;
  label: string;
}> = [
  { key: "discover", label: "Discover" },
  { key: "tickets", label: "Tickets" },
  { key: "friends", label: "Friends" },
  { key: "you", label: "You" },
];

const YOU_PATHS = new Set([
  "account",
  "me",
  "notifications",
  "payments",
  "profile",
]);

const FOCUSED_PATH_SEGMENTS = new Set([
  "checkout",
  "payment",
  "qr",
  "refund",
  "transfer",
]);

export function ticketivConsumerRouteForSection(
  section: TicketivConsumerAppSection
): TicketivConsumerShellRoute {
  if (section === "discover") return { route: "discover" };
  if (section === "tickets") return { route: "tickets" };
  if (section === "friends") return { route: "unknown", path: "/friends" };
  return { route: "unknown", path: "/me" };
}

export function ticketivConsumerSectionForRoute(
  route: TicketivConsumerShellRoute
): TicketivConsumerAppSection {
  if (route.route === "tickets" || route.route === "ticket-token") {
    return "tickets";
  }

  if (route.route === "account-settings" || route.route === "auth-callback") {
    return "you";
  }

  if (
    route.route === "checkout" ||
    route.route === "checkout-return" ||
    route.route === "order-confirmation"
  ) {
    return "tickets";
  }

  if (route.route !== "unknown") return "discover";

  const segments = route.path.split(/[/?#]/).filter(Boolean);
  const first = segments[0] ?? "";

  if (first === "friends") return "friends";
  if (YOU_PATHS.has(first)) return "you";
  if (
    first === "tickets" ||
    first === "orders" ||
    segments.some((segment) => FOCUSED_PATH_SEGMENTS.has(segment))
  ) {
    return "tickets";
  }

  return "discover";
}

export function isTicketivConsumerFocusedRoute(
  route: TicketivConsumerShellRoute
): boolean {
  if (
    route.route === "checkout" ||
    route.route === "checkout-return" ||
    route.route === "order-confirmation" ||
    route.route === "ticket-token"
  ) {
    return true;
  }

  if (route.route !== "unknown") return false;

  return route.path
    .split(/[/?#]/)
    .filter(Boolean)
    .some((segment) => FOCUSED_PATH_SEGMENTS.has(segment));
}
