/**
 * Map `v_event_public` into the MobileEventData / DesktopEventData shape.
 *
 * `v_event_public` covers title, poster, venue, pricing, and organizer. Lineup,
 * friends-going, and the fact-grid need joins not yet exposed by views
 * (event_artists, user_connections, ticket_types). Until those land, the page
 * keeps placeholder data for those sections and replaces only the fields the
 * view can answer reliably — that's a transparent partial wire, not a regression.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import type { EventPublicView } from "@/lib/schemas/views";
import type { MobileEventData } from "@/components/quiet/screens/event-detail/mobile-event";
import type { DesktopEventData } from "@/components/quiet/screens/event-detail/desktop-event";

const PLACEHOLDER_FACTS: Array<readonly [string, string]> = [
  ["Duration", "3 hours"],
  ["Language", "English"],
  ["Age limit", "18+"],
  ["Entry", "QR + photo ID"],
  ["Re-entry", "Not permitted"],
];

const PLACEHOLDER_LINEUP = [
  { name: "DJ Fun", role: "Headliner", photo: PHOTOS.face_4, headliner: true },
  { name: "Riya M.", role: "Opener", photo: PHOTOS.face_2 },
];

const PLACEHOLDER_FRIENDS = {
  count: 0,
  names: [] as string[],
  photos: [] as string[],
};

export function mapEventDetail(row: EventPublicView): MobileEventData {
  const start = row.starts_at ? new Date(row.starts_at) : null;

  const facts: Array<readonly [string, string]> = [...PLACEHOLDER_FACTS];
  if (row.venue_capacity) facts.unshift(["Capacity", row.venue_capacity.toLocaleString()]);

  return {
    id: row.slug,
    title: row.title,
    category: row.category ?? "Event",
    posterUrl: row.poster_url ?? PHOTOS.dj_set,
    description: row.description ?? "",
    dateLabel: start ? formatEventDate(start) : "Date TBA",
    timeLabel: start ? formatTimeRange(start) : "",
    venue: {
      name: row.venue_name ?? "Venue TBA",
      distanceKm: 0,
    },
    facts,
    lineup: PLACEHOLDER_LINEUP,
    organizer: {
      name: row.organizer_name ?? "Ticketiv",
      handle: row.organizer_id ? row.organizer_id.slice(0, 8) : "ticketiv",
      eventsHosted: 0,
      rating: 0,
      verified: Boolean(row.organizer_logo_url),
      photo: row.organizer_logo_url ?? PHOTOS.face_6,
    },
    goingFriends: PLACEHOLDER_FRIENDS,
    fromPriceMinor: row.min_price_cents ?? 0,
  };
}

interface TicketTypeRow {
  id: string;
  name: string;
  price_cents: number;
  quota: number | null;
}

export function mapDesktopEventDetail(
  row: EventPublicView,
  ticketTypes: TicketTypeRow[] = [],
): DesktopEventData {
  const base = mapEventDetail(row);

  return {
    ...base,
    longDescription: row.description ?? "",
    amenities: [],
    ticketTypes: ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      priceMinor: t.price_cents,
      remaining: t.quota,
    })),
  };
}
