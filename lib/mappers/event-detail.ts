/**
 * Map `v_event_public` (+ optional lineup/friends/facts) into MobileEventData /
 * DesktopEventData. `v_event_public` covers title/poster/venue/pricing/organizer
 * for free. Lineup and friends-going come from companion views; the fact grid
 * is derived from the event row itself plus the refund-policy helper.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import { formatRefundWindow, resolveRefundPolicy } from "@/lib/refund-policy";
import type { EventPublicView } from "@/lib/schemas/views";
import type { MobileEventData } from "@/components/quiet/screens/event-detail/mobile-event";
import type { DesktopEventData } from "@/components/quiet/screens/event-detail/desktop-event";

export interface EventLineupRow {
  artist_id: string;
  artist_name: string;
  artist_slug: string | null;
  artist_image_url: string | null;
  role: string | null;
}

export interface EventFriendRow {
  friend_id: string;
  friend_name: string | null;
  friend_handle: string | null;
}

interface MapInput {
  lineup?: EventLineupRow[];
  friends?: EventFriendRow[];
  refundPolicy?: unknown;
  /** Aggregate paid tickets sold across all ticket types for this event. */
  soldCount?: number | null;
  /** Distinct attendees (buyer_count) — surfaces "234 going" on detail. */
  attendeeCount?: number | null;
  /** Recent purchases within a short window, e.g. 24h. */
  recentSoldCount?: number | null;
  recentSoldWindow?: string;
  supportUrl?: string;
  /** Total events published by this organizer — drives the "23 events hosted" line. */
  organizerEventsHosted?: number | null;
}

function durationLabel(start: Date | null, end: Date | null): string | null {
  if (!start || !end) return null;
  const hours = (end.getTime() - start.getTime()) / (60 * 60 * 1000);
  if (hours <= 0) return null;
  if (hours < 24) return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} hours`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

function buildFacts(row: EventPublicView, refundPolicy: unknown, endTimeIso?: string | null) {
  const start = row.starts_at ? new Date(row.starts_at) : null;
  const end = endTimeIso ? new Date(endTimeIso) : null;
  const facts: Array<readonly [string, string]> = [];
  const dur = durationLabel(start, end);
  if (dur) facts.push(["Duration", dur]);
  if (row.venue_capacity) facts.push(["Capacity", row.venue_capacity.toLocaleString()]);
  facts.push(["Entry", "QR + photo ID"]);
  const refund = resolveRefundPolicy(refundPolicy);
  facts.push(["Refund", formatRefundWindow(refund)]);
  return facts;
}

function mapLineup(rows: EventLineupRow[] | undefined) {
  if (!rows || rows.length === 0) return [];
  return rows.map((r, i) => ({
    name: r.artist_name,
    role: r.role ?? (i === 0 ? "Headliner" : "Support"),
    photo: r.artist_image_url ?? (i % 2 === 0 ? PHOTOS.face_4 : PHOTOS.face_2),
    headliner: i === 0,
  }));
}

function mapFriends(rows: EventFriendRow[] | undefined) {
  if (!rows || rows.length === 0) return { count: 0, names: [], photos: [] };
  const names = rows.map((r) => r.friend_name).filter((n): n is string => Boolean(n)).slice(0, 5);
  // No avatar_url on profiles yet; use a deterministic placeholder per friend.
  const palette = [PHOTOS.face_1, PHOTOS.face_2, PHOTOS.face_3, PHOTOS.face_5, PHOTOS.face_7, PHOTOS.face_8];
  const photos = rows.slice(0, 5).map((_, i) => palette[i % palette.length]);
  return { count: rows.length, names, photos };
}

export function mapEventDetail(row: EventPublicView, input: MapInput = {}): MobileEventData {
  const start = row.starts_at ? new Date(row.starts_at) : null;

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
    facts: buildFacts(row, input.refundPolicy),
    lineup: mapLineup(input.lineup),
    organizer: {
      name: row.organizer_name ?? "Ticketiv",
      handle: row.organizer_id ? row.organizer_id.slice(0, 8) : "ticketiv",
      eventsHosted: input.organizerEventsHosted ?? 0,
      rating: 0,
      verified: Boolean(row.organizer_logo_url),
      photo: row.organizer_logo_url ?? PHOTOS.face_6,
    },
    goingFriends: mapFriends(input.friends),
    fromPriceMinor: row.min_price_cents ?? 0,
    attendeeCount: input.attendeeCount ?? null,
    soldCount: input.soldCount ?? null,
    recentSoldCount: input.recentSoldCount ?? null,
    recentSoldWindow: input.recentSoldWindow,
    supportUrl: input.supportUrl,
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
  input: MapInput = {},
): DesktopEventData {
  const base = mapEventDetail(row, input);
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
