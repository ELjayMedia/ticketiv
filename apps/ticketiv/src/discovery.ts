export const TICKETIV_PUBLIC_ORIGIN = "https://ticketiv.app";

export type TicketivDiscoverEvent = {
  id: string;
  slug: string;
  title: string;
  photo: string;
  whenLabel: string;
  venue: string;
  city: string | null;
  priceLabel: string;
  category: string | null;
  stockLabel: string | null;
  stockType: "sold-out" | "low" | null;
};

export type TicketivDiscoverFetch = (
  input: string,
  init: { headers: { accept: string } }
) => Promise<Pick<Response, "json" | "ok">>;

export function readTicketivDiscoverEvents(value: unknown): TicketivDiscoverEvent[] {
  if (!value || typeof value !== "object" || !("events" in value)) return [];
  const events = (value as { events?: unknown }).events;
  if (!Array.isArray(events)) return [];

  return events.filter(isTicketivDiscoverEvent);
}

export async function fetchTicketivDiscoverEvents(
  fetcher: TicketivDiscoverFetch = fetch,
  origin = TICKETIV_PUBLIC_ORIGIN
): Promise<TicketivDiscoverEvent[]> {
  const response = await fetcher(`${origin}/api/discover/events?limit=24`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error("Events are unavailable right now.");
  return readTicketivDiscoverEvents(await response.json());
}

function isTicketivDiscoverEvent(value: unknown): value is TicketivDiscoverEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<TicketivDiscoverEvent>;
  return Boolean(
    typeof event.id === "string" &&
      typeof event.slug === "string" &&
      typeof event.title === "string" &&
      typeof event.photo === "string" &&
      typeof event.whenLabel === "string" &&
      typeof event.venue === "string" &&
      typeof event.priceLabel === "string"
  );
}
