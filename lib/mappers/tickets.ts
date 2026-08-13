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
import { resolveRefundPolicy, refundQuoteForHoursBefore, formatRefundWindow } from "@/lib/refund-policy";
import type { MyTicketsView } from "@/lib/schemas/views";
import { ticketDisplayStatus, type TicketDisplayStatus } from "@/lib/ticket-status";

export { ticketDisplayStatus, type TicketDisplayStatus } from "@/lib/ticket-status";

export interface FeaturedTicketProp {
  ticketId: string;
  orderId: string;
  orderStatus: string;
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
  /** ISO string for the event start — used for refund eligibility check. */
  eventStartsAt: string | null;
  /** ISO string for check-in timestamp — null if not yet checked in. */
  checkedInAt: string | null;
}

export interface TicketListItemProp {
  ticketId: string;
  orderId: string;
  orderStatus: string;
  title: string;
  photo: string;
  whenLabel: string;
  venueLabel: string;
  /** ISO string for the event start — used for refund eligibility check. */
  eventStartsAt: string | null;
  /** ISO string for check-in timestamp — null if not yet checked in. */
  checkedInAt: string | null;
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
    orderId: row.order_id,
    orderStatus: row.order_status,
    title: row.event_title,
    photo: row.cover_image_url ?? PHOTOS.singer_red,
    whenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date TBA",
    venueLabel: row.venue_name ?? "Venue TBA",
    eventStartsAt: row.event_starts_at ?? null,
    checkedInAt: row.checked_in_at ?? null,
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
    orderId: row.order_id,
    orderStatus: row.order_status,
    orderNumber: shortOrderNumber(row.order_id),
    eventTitle: row.event_title,
    eventPhoto: row.cover_image_url ?? PHOTOS.dj_set,
    whenLabel: start ? `${formatEventDate(start).toUpperCase()} · ${formatTimeRange(start)}` : "DATE TBA",
    venueLabel: row.venue_name ?? "Venue TBA",
    seatLabel: row.ticket_type_name ?? "General",
    daysUntil,
    urgencyLabel: urgency.label,
    isEventDay: urgency.isEventDay,
    eventStartsAt: row.event_starts_at ?? null,
    checkedInAt: row.checked_in_at ?? null,
  };
}

export interface RefundCtaData {
  orderId: string;
  available: boolean;
  policyLabel: string;
  refundBps: number | null;
  deadlineLabel: string | null;
}

export interface TicketViewProp {
  id: string;
  orderId: string;
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
  /** Auth-scoped owner key used only to isolate device copies between accounts. */
  offlineOwnerId: string;
  /** ISO time after which the service worker removes the device copy. */
  offlineExpiresAt: string;
  /** Null when refund policy data was not fetched. */
  refundCta: RefundCtaData | null;
}

const DEADLINE_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function mapTicketView(
  row: MyTicketsView,
  opts: {
    position?: number;
    totalInOrder?: number;
    holderName?: string;
    refundPolicy?: unknown;
    offlineExpiresAt?: string;
  } = {},
): TicketViewProp {
  const start = row.event_starts_at ? new Date(row.event_starts_at) : null;
  const status = ticketDisplayStatus(row);
  const valid = status === "issued";

  let refundCta: RefundCtaData | null = null;
  if ("refundPolicy" in opts) {
    const policy = resolveRefundPolicy(opts.refundPolicy);
    const msUntil = start ? Math.max(0, start.getTime() - Date.now()) : 0;
    const hoursBefore = msUntil / (60 * 60 * 1000);
    const band = refundQuoteForHoursBefore(policy, hoursBefore);
    const available = valid && band !== null && band.refundBps > 0;

    let deadlineLabel: string | null = null;
    if (policy.bands.length > 0 && start) {
      const lastBand = policy.bands[policy.bands.length - 1];
      const deadline = new Date(start.getTime() - lastBand.hoursBefore * 60 * 60 * 1000);
      deadlineLabel = `Refund by ${DEADLINE_FMT.format(deadline)}`;
    }

    refundCta = {
      orderId: row.order_id,
      available,
      policyLabel: `${policy.label} · ${formatRefundWindow(policy)}`,
      refundBps: band?.refundBps ?? null,
      deadlineLabel,
    };
  }

  return {
    id: row.order_item_id,
    orderId: row.order_id,
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
    status: status === "pending" ? "issued" : status,
    offlineOwnerId: row.current_owner_id ?? row.buyer_id,
    offlineExpiresAt: opts.offlineExpiresAt ?? new Date(Date.now() + 7 * DAY_MS).toISOString(),
    refundCta,
  };
}

export function mapMyTickets(rows: MyTicketsView[]): MyTicketsProps {
  const now = Date.now();

  // Pending order_items belong on the confirmation page, not the ticket list.
  // Everything else (issued / checked_in / transferred / refunded / revoked)
  // is fair game — but featured-eligible is narrower (must be valid + future).
  const visible = rows.filter((r) => ticketDisplayStatus(r) !== "pending");

  // A successful scan completes the attendee journey immediately. Treat a
  // checked-in ticket as past even when the event start time is still in the
  // future (for example, when doors open before the advertised start).
  const isPastTicket = (row: MyTicketsView): boolean =>
    ticketDisplayStatus(row) === "checked_in"
    || !row.event_starts_at
    || new Date(row.event_starts_at).getTime() < now;

  const upcomingRows = visible
    .filter((r) => !isPastTicket(r))
    .sort((a, b) => new Date(a.event_starts_at!).getTime() - new Date(b.event_starts_at!).getTime());

  const pastRows = visible
    .filter(isPastTicket)
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
