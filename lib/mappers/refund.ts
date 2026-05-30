/**
 * Map BuyerOrder into Refund screen props. The screen's policy-band logic is
 * hard-coded to {full @ 2d+, half @ 1d, none < 1d}; we compute `daysUntil`
 * from event_starts_at, which is what selects the right band on render.
 *
 * The screen does not yet read the refund_policy jsonb directly — it works
 * off `daysUntil` against its own band table. We hand both through so a
 * follow-up that surfaces the resolved bands has them ready.
 */

import { PHOTOS } from "@/lib/photos";
import { resolveRefundPolicy } from "@/lib/refund-policy";
import type { BuyerOrder } from "@/lib/data/attendee/orders";

export interface RefundOrderProp {
  id: string;
  orderNumber: string;
  eventTitle: string;
  eventPhoto: string;
  whenLabel: string;
  totalMinor: number;
  bookingFeeMinor: number;
  paymentDescription: string;
  tickets: Array<{ ticketId: string; seatLabel: string; typeLabel: string; priceMinor: number }>;
}

export interface RefundScreenProps {
  order: RefundOrderProp;
  daysUntil: number;
}

const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function mapRefund(order: BuyerOrder): RefundScreenProps {
  const first = order.items[0];
  const start = first?.event_starts_at ? new Date(first.event_starts_at) : null;
  const daysUntil = start ? Math.max(0, Math.ceil((start.getTime() - Date.now()) / (24 * 60 * 60 * 1000))) : 0;

  return {
    order: {
      id: order.id,
      orderNumber: order.id.slice(0, 6).toUpperCase(),
      eventTitle: first?.event_title ?? "Your event",
      eventPhoto: first?.cover_image_url ?? PHOTOS.dj_set,
      whenLabel: start ? WHEN.format(start).toUpperCase() : "DATE TBA",
      totalMinor: order.total_cents,
      bookingFeeMinor: order.platform_fee_cents ?? 0,
      paymentDescription: order.status === "paid" ? "Paid" : order.status,
      tickets: order.items.map((it) => ({
        ticketId: it.id ?? "",
        seatLabel: it.ticket_type_name ?? "General",
        typeLabel: it.ticket_type_name ?? "General",
        priceMinor: it.price_cents ?? 0,
      })),
    },
    daysUntil,
  };
}

/**
 * Re-export the policy resolver so the screen (and any future panel that
 * wants to render the full band list) doesn't need to import from
 * `lib/refund-policy` directly.
 */
export { resolveRefundPolicy };
