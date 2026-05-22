/**
 * Map `v_my_tickets` rows into the props the Quiet tickets screens want.
 *
 * The view returns one row per `order_item`, scoped by RLS to the current
 * user (buyer_id = auth.uid()). We partition by `event_starts_at` to find
 * the featured ticket (next upcoming), the rest of upcoming, and past.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import type { MyTicketsView } from "@/lib/schemas/views";

export interface FeaturedTicketProp {
  ticketId: string;
  orderNumber: string;
  eventTitle: string;
  eventPhoto: string;
  whenLabel: string;
  venueLabel: string;
  seatLabel: string;
  daysUntil: number;
}

export interface TicketListItemProp {
  ticketId: string;
  title: string;
  photo: string;
  whenLabel: string;
  venueLabel: string;
  count: number;
  status: "issued" | "transferred";
}

export interface MyTicketsProps {
  featured?: FeaturedTicketProp;
  upcoming: TicketListItemProp[];
  past: TicketListItemProp[];
  counts: { upcoming: number; past: number; transfers: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function shortOrderNumber(orderId: string): string {
  return orderId.slice(0, 6).toUpperCase();
}

function ticketStatus(row: MyTicketsView): "issued" | "transferred" {
  if (row.revoked_at) return "transferred";
  return "issued";
}

function toListItem(row: MyTicketsView): TicketListItemProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  return {
    ticketId: row.order_item_id,
    title: row.event_title,
    photo: row.cover_image_url ?? PHOTOS.singer_red,
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date TBA",
    venueLabel: row.venue_name ?? "Venue TBA",
    count: 1,
    status: ticketStatus(row),
  };
}

function toFeatured(row: MyTicketsView): FeaturedTicketProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  const days = start ? Math.max(0, Math.ceil((start.getTime() - Date.now()) / DAY_MS)) : 0;
  return {
    ticketId: row.order_item_id,
    orderNumber: shortOrderNumber(row.order_id),
    eventTitle: row.event_title,
    eventPhoto: row.cover_image_url ?? PHOTOS.dj_set,
    whenLabel: start ? `${formatEventDate(start).toUpperCase()} · ${formatTimeRange(start)}` : "DATE TBA",
    venueLabel: row.venue_name ?? "Venue TBA",
    seatLabel: row.ticket_type_name ?? "General",
    daysUntil: days,
  };
}

export interface TicketViewProp {
  id: string;
  orderNumber: string;
  positionLabel: string;
  totalInOrder: number;
  eventTitle: string;
  eventPhoto: string;
  dateLabel: string;
  timeLabel: string;
  doorsLabel: string;
  holderName: string;
  seatLabel: string;
  typeLabel: string;
  venueName: string;
  venueAddress: string;
  venueDistanceKm: number;
  qrCode: string;
  isValid: boolean;
}

export function mapTicketView(
  row: MyTicketsView,
  opts: { position?: number; totalInOrder?: number; holderName?: string } = {},
): TicketViewProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  return {
    id: row.order_item_id,
    orderNumber: shortOrderNumber(row.order_id),
    positionLabel: opts.totalInOrder ? `${opts.position ?? 1} of ${opts.totalInOrder}` : "1 of 1",
    totalInOrder: opts.totalInOrder ?? 1,
    eventTitle: row.event_title,
    eventPhoto: row.cover_image_url ?? PHOTOS.dj_set,
    dateLabel: start ? formatEventDate(start) : "Date TBA",
    timeLabel: start ? formatTimeRange(start) : "",
    doorsLabel: "",
    holderName: opts.holderName ?? "",
    seatLabel: row.ticket_type_name ?? "General",
    typeLabel: row.ticket_type_name ?? "General",
    venueName: row.venue_name ?? "Venue TBA",
    venueAddress: row.venue_address ?? "",
    venueDistanceKm: 0,
    qrCode: row.ticket_code,
    isValid: !row.revoked_at && !row.checked_in_at,
  };
}

export function mapMyTickets(rows: MyTicketsView[]): MyTicketsProps {
  const now = Date.now();
  const upcomingRows = rows
    .filter((r) => r.event_starts_at && new Date(r.event_starts_at).getTime() >= now && !r.revoked_at)
    .sort((a, b) => new Date(a.event_starts_at!).getTime() - new Date(b.event_starts_at!).getTime());
  const pastRows = rows
    .filter((r) => r.event_starts_at && new Date(r.event_starts_at).getTime() < now)
    .sort((a, b) => new Date(b.event_starts_at!).getTime() - new Date(a.event_starts_at!).getTime());

  const [first, ...restUpcoming] = upcomingRows;

  return {
    featured: first ? toFeatured(first) : undefined,
    upcoming: restUpcoming.map(toListItem),
    past: pastRows.map(toListItem),
    counts: {
      upcoming: upcomingRows.length,
      past: pastRows.length,
      transfers: 0,
    },
  };
}
