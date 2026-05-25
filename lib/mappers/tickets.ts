/**
 * Map `v_my_tickets` rows into the props the Quiet tickets screens want.
 *
 * The view returns one row per `order_item`, scoped by RLS to the current
 * user (buyer_id = auth.uid()). We partition by `event_starts_at` to find
 * the featured ticket (next upcoming), the rest of upcoming, and past.
 *
 * Status precedence (most-specific wins):
 *   refunded > revoked > transferred > checked_in > issued
 * Pending order_items (order still awaiting payment) are filtered out
 * entirely — they don't belong on the attendee surface.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import type { MyTicketsView } from "@/lib/schemas/views";

export type TicketDisplayStatus =
  | "issued"
  | "checked_in"
  | "transferred"
  | "refunded"
  | "revoked";

export interface FeaturedTicketProp {
  ticketId: string;
  orderNumber: string;
  eventTitle: string;
  eventPhoto: string;
  whenLabel: string;
  venueLabel: string;
  seatLabel: string;
  daysUntil: number;
  /** "TODAY" / "TOMORROW" / "IN N DAYS" — pre-formatted for the urgency chip. */
  urgencyLabel: string;
  isEventDay: boolean;
}

export interface TicketListItemProp {
  ticketId: string;
  title: string;
  photo: string;
  whenLabel: string;
  venueLabel: string;
  count: number;
  status: TicketDisplayStatus;
}

export interface MyTicketsProps {
  featured?: FeaturedTicketProp;
  upcoming: TicketListItemProp[];
  past: TicketListItemProp[];
  counts: { upcoming: number; past: number; transfers: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function shortOrderNumber(orderId: string): string {
  return orderId.slice(0, 6).toUpperCase();
}

/**
 * Map raw v_my_tickets row state to the display status the UI cares about.
 * Order matters — the first match wins.
 */
export function ticketDisplayStatus(row: MyTicketsView): TicketDisplayStatus | "pending" {
  if (row.order_item_status === "refunded" || row.refunded_at) return "refunded";
  if (row.order_item_status === "revoked" || row.revoked_at) return "revoked";
  if (row.order_item_status === "transferred") return "transferred";
  if (row.order_item_status === "checked_in" || row.checked_in_at) return "checked_in";
  if (row.order_item_status === "issued") return "issued";
  return "pending";
}

/**
 * A ticket is "valid for entry" when it's currently issued and the buyer
 * still holds it. Refunded, revoked, transferred-away and already-used
 * tickets should NOT show a scannable QR.
 */
export function isTicketValidForEntry(row: MyTicketsView): boolean {
  return ticketDisplayStatus(row) === "issued";
}

function urgencyFor(daysUntil: number, msUntil: number): { label: string; isEventDay: boolean } {
  if (msUntil <= 0) return { label: "STARTED", isEventDay: true };
  if (msUntil <= 6 * HOUR_MS) {
    const hours = Math.max(1, Math.round(msUntil / HOUR_MS));
    return { label: `IN ${hours} HR${hours === 1 ? "" : "S"}`, isEventDay: true };
  }
  if (daysUntil <= 0) return { label: "TODAY", isEventDay: true };
  if (daysUntil === 1) return { label: "TOMORROW", isEventDay: false };
  return { label: `IN ${daysUntil} DAYS`, isEventDay: false };
}

function toListItem(row: MyTicketsView): TicketListItemProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  const status = ticketDisplayStatus(row);
  return {
    ticketId: row.order_item_id,
    title: row.event_title,
    photo: row.cover_image_url ?? PHOTOS.singer_red,
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date TBA",
    venueLabel: row.venue_name ?? "Venue TBA",
    count: 1,
    // Pending rows are filtered before this mapper runs.
    status: status === "pending" ? "issued" : status,
  };
}

function toFeatured(row: MyTicketsView): FeaturedTicketProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  const msUntil = start ? start.getTime() - Date.now() : 0;
  const daysUntil = start ? Math.max(0, Math.ceil(msUntil / DAY_MS)) : 0;
  const urgency = urgencyFor(daysUntil, msUntil);
  return {
    ticketId: row.order_item_id,
    orderNumber: shortOrderNumber(row.order_id),
    eventTitle: row.event_title,
    eventPhoto: row.cover_image_url ?? PHOTOS.dj_set,
    whenLabel: start ? `${formatEventDate(start).toUpperCase()} · ${formatTimeRange(start)}` : "DATE TBA",
    venueLabel: row.venue_name ?? "Venue TBA",
    seatLabel: row.ticket_type_name ?? "General",
    daysUntil,
    urgencyLabel: urgency.label,
    isEventDay: urgency.isEventDay,
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
  /** The QR encoder reads this. Empty string when the ticket isn't valid. */
  qrCode: string;
  /** True only when the ticket is issued and not yet used / transferred / refunded / revoked. */
  isValid: boolean;
  status: TicketDisplayStatus;
}

export function mapTicketView(
  row: MyTicketsView,
  opts: { position?: number; totalInOrder?: number; holderName?: string } = {},
): TicketViewProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  const status = ticketDisplayStatus(row);
  const valid = status === "issued";
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
    qrCode: valid ? row.ticket_code : "",
    isValid: valid,
    // The list mapper coerces "pending" → "issued"; here we keep the raw
    // value so the screen can show a clear non-valid state.
    status: status === "pending" ? "issued" : status,
  };
}

export function mapMyTickets(rows: MyTicketsView[]): MyTicketsProps {
  const now = Date.now();

  // Pending order_items belong on the confirmation page, not the ticket list.
  // Everything else (issued / checked_in / transferred / refunded / revoked)
  // is fair game — but featured-eligible is narrower (must be valid + future).
  const visible = rows.filter((r) => ticketDisplayStatus(r) !== "pending");

  const upcomingRows = visible
    .filter((r) => r.event_starts_at && new Date(r.event_starts_at).getTime() >= now)
    .sort((a, b) => new Date(a.event_starts_at!).getTime() - new Date(b.event_starts_at!).getTime());

  const pastRows = visible
    .filter((r) => !r.event_starts_at || new Date(r.event_starts_at).getTime() < now)
    .sort((a, b) => {
      const ax = a.event_starts_at ? new Date(a.event_starts_at).getTime() : 0;
      const bx = b.event_starts_at ? new Date(b.event_starts_at).getTime() : 0;
      return bx - ax;
    });

  const featuredRow = upcomingRows.find((r) => isTicketValidForEntry(r));
  const restUpcoming = featuredRow
    ? upcomingRows.filter((r) => r.order_item_id !== featuredRow.order_item_id)
    : upcomingRows;

  return {
    featured: featuredRow ? toFeatured(featuredRow) : undefined,
    upcoming: restUpcoming.map(toListItem),
    past: pastRows.map(toListItem),
    counts: {
      upcoming: upcomingRows.length,
      past: pastRows.length,
      transfers: 0,
    },
  };
}
