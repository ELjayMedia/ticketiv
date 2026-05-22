/**
 * Map `v_events_public` rows into the shape consumed by the Quiet discover
 * screens. Keeps the components ignorant of DB column names; if `v_events_public`
 * ever gains/loses a column we update only the mapper.
 */

import { formatEventDate, formatTimeRange, formatPrice } from "@/lib/format";
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
}

export function mapDiscoverEvent(row: EventsPublicView & { featured_priority?: number | null }): DiscoverEvent {
  const start = row.starts_at ? new Date(row.starts_at) : null;
  const minPrice = row.min_price_cents ?? null;
  const currency = asCurrency(row.currency);

  return {
    id: row.id,
    slug: row.slug,
    href: `/events/${row.slug}`,
    title: row.title,
    photo: row.poster_url ?? "",
    startsAtMs: start ? start.getTime() : null,
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "",
    dateShort: start ? formatEventDate(start) : "",
    timeShort: start ? formatTimeRange(start) : "",
    venue: row.venue_name ?? "",
    city: row.city,
    priceLabel: minPrice === null ? "" : minPrice === 0 ? "Free" : `From ${formatPrice(minPrice, currency)}`,
    fromPriceCents: minPrice,
    category: row.category,
    featuredPriority: row.featured_priority ?? null,
  };
}

export function partitionDiscover(events: DiscoverEvent[]) {
  const now = Date.now();
  const sixHours = 6 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const tonight: DiscoverEvent[] = [];
  const thisWeek: DiscoverEvent[] = [];

  // Editor's pick: highest featured_priority wins; fallback to first upcoming.
  let editorPick: DiscoverEvent | null = null;
  let bestPriority = -1;

  for (const ev of events) {
    if (ev.startsAtMs === null) continue;
    const delta = ev.startsAtMs - now;
    if (delta < 0) continue;
    if (delta <= sixHours) tonight.push(ev);
    else if (delta <= sevenDays) thisWeek.push(ev);

    if (ev.featuredPriority !== null && ev.featuredPriority > bestPriority) {
      editorPick = ev;
      bestPriority = ev.featuredPriority;
    } else if (bestPriority < 0 && !editorPick) {
      editorPick = ev;
    }
  }
  return { tonight, thisWeek, editorPick };
}
