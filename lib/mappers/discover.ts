/**
 * Map `v_events_public` rows into the shape consumed by the Quiet discover
 * screens. Keeps the components ignorant of DB column names; if `v_events_public`
 * ever gains/loses a column we update only the mapper.
 */

import {
  formatEventDate,
  formatTimeRange,
  formatPriceLabel,
  formatVenueLabel,
  formatSoldCount,
} from "@/lib/format";
import { asCurrency } from "@/lib/currency";
import type { EventsPublicView } from "@/lib/schemas/views";

export interface DiscoverEvent {
  id: string;
  slug: string;
  href: string;
  title: string;
  photo: string;
  startsAtMs: number | null;
  whenLabel: string;
  dateShort: string;
  timeShort: string;
  venue: string;
  city: string | null;
  priceLabel: string;
  fromPriceCents: number | null;
  category: string | null;
  featuredPriority: number | null;
  ticketsSold: number | null;
  /** "1.2k sold" or null when below the safe-display threshold. */
  soldLabel: string | null;
  ticketsAvailable: number | null;
  /** "Only X left" / "Sold out" when near or at zero; null otherwise. */
  stockLabel: string | null;
  /** Distinguishes sold-out vs low-stock for badge colouring. */
  stockType: "sold-out" | "low" | null;
  organizerName: string | null;
  /** Derived from organizer_logo_url presence — matches the rule used by
   *  the event-detail mapper so cards and detail agree. */
  organizerVerified: boolean;
}

export function mapDiscoverEvent(row: EventsPublicView & { featured_priority?: number | null }): DiscoverEvent {
  const start = row.starts_at ? new Date(row.starts_at) : null;
  const minPrice = row.min_price_cents ?? null;
  const currency = asCurrency(row.currency);
  const ticketsSold = typeof row.tickets_sold === "number" ? row.tickets_sold : null;
  const ticketsAvailable = typeof row.tickets_available === "number" ? row.tickets_available : null;
  const stockType: DiscoverEvent["stockType"] =
    ticketsAvailable === null ? null :
    ticketsAvailable === 0 ? "sold-out" :
    ticketsAvailable <= 10 ? "low" :
    null;
  const stockLabel =
    stockType === "sold-out" ? "Sold out" :
    stockType === "low" ? `Only ${ticketsAvailable} left` :
    null;

  return {
    id: row.id,
    slug: row.slug,
    href: `/events/${row.slug}`,
    title: row.title,
    photo: row.poster_url ?? "",
    startsAtMs: start ? start.getTime() : null,
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date coming soon",
    dateShort: start ? formatEventDate(start) : "Date TBA",
    timeShort: start ? formatTimeRange(start) : "",
    venue: formatVenueLabel(row.venue_name),
    city: row.city,
    priceLabel: formatPriceLabel(minPrice, currency, { prefix: "From" }),
    fromPriceCents: minPrice,
    category: row.category,
    featuredPriority: row.featured_priority ?? null,
    ticketsSold,
    soldLabel: formatSoldCount(ticketsSold),
    ticketsAvailable,
    stockLabel,
    stockType,
    organizerName: row.organizer_name ?? null,
    organizerVerified: Boolean(row.organizer_logo_url),
  };
}

/** Discover's "This week" window: everything that has not ended and starts within the next 7 days. */
export const DISCOVER_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Editor's pick: highest featured_priority wins; otherwise the soonest event. */
export function pickEditorPick(events: DiscoverEvent[]): DiscoverEvent | null {
  let editorPick: DiscoverEvent | null = null;
  let bestPriority = -1;
  for (const ev of events) {
    if (ev.featuredPriority !== null && ev.featuredPriority > bestPriority) {
      editorPick = ev;
      bestPriority = ev.featuredPriority;
    } else if (bestPriority < 0 && !editorPick) {
      editorPick = ev;
    }
  }
  return editorPick;
}
