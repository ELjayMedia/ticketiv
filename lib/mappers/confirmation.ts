/**
 * Map a BuyerOrder (orders + v_my_tickets join) into the OrderConfirmation
 * screen's prop shape. One mapper for both desktop and mobile — the screen
 * already handles the responsive layout.
 */

import { PHOTOS } from "@/lib/photos";
import type { BuyerOrder } from "@/lib/data/attendee/orders";

export interface ConfirmationProps {
  id: string;
  orderNumber: string;
  eventTitle: string;
  eventSubtitle?: string;
  eventPhoto: string;
  whenDate: string;
  whenTime: string;
  seats?: string[];
  ticketTypeName: string;
  quantity: number;
  totalMinor: number;
  paymentDescription: string;
  receiptEmail: string;
  firstTicketId: string;
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const SHORT_TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

export function mapConfirmation(order: BuyerOrder): ConfirmationProps {
  const first = order.items[0];
  const start = first?.event_starts_at ? new Date(first.event_starts_at) : null;
  const ticketName = first?.ticket_type_name ?? "General";

  return {
    id: order.id,
    orderNumber: order.id.slice(0, 6).toUpperCase(),
    eventTitle: first?.event_title ?? "Your event",
    eventSubtitle: ticketName.toUpperCase(),
    eventPhoto: first?.cover_image_url ?? PHOTOS.dj_set,
    whenDate: start ? SHORT_DATE.format(start) : "TBA",
    whenTime: start ? SHORT_TIME.format(start) : "",
    ticketTypeName: ticketName,
    quantity: order.items.length,
    totalMinor: order.total_cents,
    paymentDescription: order.status === "paid" ? "Paid" : order.status,
    receiptEmail: order.buyer_email ?? "",
    firstTicketId: first?.id ?? "",
  };
}
