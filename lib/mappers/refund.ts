import { PHOTOS } from "@/lib/photos";
import {
  refundQuoteForHoursBefore,
  resolveRefundPolicy,
  type RefundBand,
} from "@/lib/refund-policy";
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
  hoursUntil: number;
  refundBps: number;
  policy: {
    label: string;
    bands: RefundBand[];
  };
}

const WHEN = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });

export function mapRefund(order: BuyerOrder): RefundScreenProps {
  const first = order.items[0];
  const start = first?.event_starts_at ? new Date(first.event_starts_at) : null;
  const hoursUntil = start
    ? Math.max(0, (start.getTime() - Date.now()) / (60 * 60 * 1000))
    : 0;
  const policy = resolveRefundPolicy(order.refund_policy);
  const quote = refundQuoteForHoursBefore(policy, hoursUntil);

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
    hoursUntil,
    refundBps: quote?.refundBps ?? 0,
    policy: {
      label: policy.label,
      bands: policy.bands,
    },
  };
}

export { resolveRefundPolicy };
