/**
 * Map a BuyerOrder (orders + v_my_tickets join) into the OrderConfirmation
 * screen's prop shape. One mapper for both desktop and mobile — the screen
 * already handles the responsive layout.
 */

import { PHOTOS } from "@/lib/photos";
import { asCurrency } from "@/lib/currency";
import type { Currency } from "@/lib/format";
import type { BuyerOrder } from "@/lib/data/attendee/orders";

export type ConfirmationState = "paid" | "pending" | "failed" | "refunded";

export interface ConfirmationProps {
  id: string;
  orderNumber: string;
  state: ConfirmationState;
  /** Headline shown above the event card. */
  headline: string;
  /** Short status note (e.g. "Tickets issued", "Waiting for confirmation"). */
  statusNote: string;
  eventTitle: string;
  eventSubtitle?: string;
  eventPhoto: string;
  whenDate: string;
  whenTime: string;
  seats?: string[];
  ticketTypeName: string;
  quantity: number;
  totalMinor: number;
  currency: Currency;
  paymentDescription: string;
  receiptEmail: string;
  /** Slug of the event so failed/pending states can offer a retry CTA. */
  eventSlug: string | null;
  firstTicketId: string;
}

const SHORT_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const SHORT_TIME = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

function deriveState(orderStatus: string): ConfirmationState {
  switch (orderStatus) {
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
    default:
      return "pending";
  }
}

function copyForState(state: ConfirmationState): { headline: string; statusNote: string; paymentDescription: string } {
  switch (state) {
    case "paid":
      return { headline: "You're going.", statusNote: "Tickets issued", paymentDescription: "Paid" };
    case "pending":
      return {
        headline: "Confirming your payment…",
        statusNote: "We're waiting for your bank to confirm. This usually takes a few seconds.",
        paymentDescription: "Pending",
      };
    case "failed":
      return {
        headline: "Payment didn't go through.",
        statusNote: "Your card or bank declined the charge. Pick a ticket again to retry.",
        paymentDescription: "Failed",
      };
    case "refunded":
      return {
        headline: "Order refunded.",
        statusNote: "These tickets are no longer valid for entry.",
        paymentDescription: "Refunded",
      };
  }
}

export function mapConfirmation(order: BuyerOrder): ConfirmationProps {
  const first = order.items[0];
  const start = first?.event_starts_at ? new Date(first.event_starts_at) : null;
  const ticketName = first?.ticket_type_name ?? "General";
  const state = deriveState(order.status);
  const copy = copyForState(state);

  return {
    id: order.id,
    orderNumber: order.id.slice(0, 6).toUpperCase(),
    state,
    headline: copy.headline,
    statusNote: copy.statusNote,
    eventTitle: first?.event_title ?? "Your event",
    eventSubtitle: ticketName.toUpperCase(),
    eventPhoto: first?.cover_image_url ?? PHOTOS.dj_set,
    whenDate: start ? SHORT_DATE.format(start) : "TBA",
    whenTime: start ? SHORT_TIME.format(start) : "",
    ticketTypeName: ticketName,
    quantity: order.items.length,
    totalMinor: order.total_cents,
    currency: asCurrency(order.currency),
    paymentDescription: copy.paymentDescription,
    receiptEmail: order.buyer_email ?? "",
    eventSlug: first?.event_slug ?? null,
    firstTicketId: first?.id ?? "",
  };
}
