"use client";

import * as React from "react";
import { track } from "@vercel/analytics/react";

type FunnelValue = string | number | boolean | null | undefined;
type FunnelProps = Record<string, FunnelValue>;

type BuyerFunnelEvent =
  | "event_view"
  | "add_to_checkout"
  | "checkout_start"
  | "checkout_error"
  | "payment_method_selected"
  | "payment_redirect"
  | "payment_success"
  | "payment_failure"
  | "payment_pending";

export function trackBuyerFunnel(event: BuyerFunnelEvent, properties: FunnelProps = {}) {
  track(`buyer_funnel_${event}`, properties);
}

export function EventViewTracker({
  eventId,
  eventSlug,
  category,
  fromPriceMinor,
  ticketTypeCount,
}: {
  eventId: string;
  eventSlug: string;
  category: string | null;
  fromPriceMinor: number | null;
  ticketTypeCount: number;
}) {
  React.useEffect(() => {
    trackBuyerFunnel("event_view", {
      event_id: eventId,
      event_slug: eventSlug,
      category,
      from_price_minor: fromPriceMinor,
      ticket_type_count: ticketTypeCount,
    });
  }, [category, eventId, eventSlug, fromPriceMinor, ticketTypeCount]);

  return null;
}

export function CheckoutStartTracker({
  eventId,
  eventSlug,
  ticketTypeCount,
  hasHold,
}: {
  eventId: string;
  eventSlug: string;
  ticketTypeCount: number;
  hasHold: boolean;
}) {
  React.useEffect(() => {
    trackBuyerFunnel("checkout_start", {
      event_id: eventId,
      event_slug: eventSlug,
      ticket_type_count: ticketTypeCount,
      has_hold: hasHold,
    });
  }, [eventId, eventSlug, hasHold, ticketTypeCount]);

  return null;
}

export function PaymentOutcomeTracker({
  orderId,
  state,
  eventSlug,
  quantity,
  totalMinor,
}: {
  orderId: string;
  state: "paid" | "pending" | "failed" | "refunded";
  eventSlug: string | null;
  quantity: number;
  totalMinor: number;
}) {
  React.useEffect(() => {
    if (state === "refunded") return;
    const event =
      state === "paid"
        ? "payment_success"
        : state === "failed"
          ? "payment_failure"
          : "payment_pending";

    trackBuyerFunnel(event, {
      order_id: orderId,
      event_slug: eventSlug,
      quantity,
      total_minor: totalMinor,
    });
  }, [eventSlug, orderId, quantity, state, totalMinor]);

  return null;
}
