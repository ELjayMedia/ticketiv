/**
 * Map Supabase event + ticket_types + pricing_plan into the shapes the
 * checkout screens consume. Pricing math (subtotal, fees, VAT, total) lives
 * inside the screen components — we just hand them the inputs.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange, type Currency } from "@/lib/format";
import { asCurrency } from "@/lib/currency";
import type { EventPublicView } from "@/lib/schemas/views";

export interface CheckoutTicketTypeRow {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  remaining: number | null;
  sales_status?: string | null;
  per_user_limit?: number | null;
  per_order_limit?: number | null;
}

export interface CheckoutTicketTypeProp {
  id: string;
  name: string;
  priceMinor: number;
  currency: Currency;
  remaining: number | null;
  sublabel?: string;
  perUserLimit: number | null;
  perOrderLimit: number | null;
  salesStatus: string | null;
}

/** A priced cart line, ready for the checkout summary. */
export interface CheckoutCartLine {
  ticketTypeId: string;
  name: string;
  priceMinor: number;
  currency: Currency;
  quantity: number;
}

export function mapCheckoutCartLines(
  cart: ReadonlyArray<{ ticketTypeId: string; quantity: number }>,
  types: ReadonlyArray<CheckoutTicketTypeProp>,
): CheckoutCartLine[] {
  const byId = new Map(types.map((t) => [t.id, t]));
  return cart.flatMap((line) => {
    const type = byId.get(line.ticketTypeId);
    if (!type) return [];
    return [{
      ticketTypeId: type.id,
      name: type.name,
      priceMinor: type.priceMinor,
      currency: type.currency,
      quantity: line.quantity,
    }];
  });
}

export function cartSubtotalMinor(lines: ReadonlyArray<CheckoutCartLine>): number {
  return lines.reduce((sum, l) => sum + l.priceMinor * l.quantity, 0);
}

export interface CheckoutEventProps {
  eventId: string;
  eventTitle: string;
  eventPhoto: string;
  eventWhenLabel: string;
  eventVenue: string;
}

export function mapCheckoutEvent(row: EventPublicView): CheckoutEventProps {
  const start = row.starts_at ? new Date(row.starts_at) : null;
  return {
    eventId: row.slug,
    eventTitle: row.title,
    eventPhoto: row.poster_url ?? PHOTOS.dj_set,
    eventWhenLabel: start ? `${formatEventDate(start)} · ${formatTimeRange(start)}` : "Date TBA",
    eventVenue: row.venue_name ?? "",
  };
}

export function mapCheckoutTicketType(t: CheckoutTicketTypeRow): CheckoutTicketTypeProp {
  let sublabel: string | undefined;
  if (t.sales_status === "paused") sublabel = "Sales paused";
  else if (t.remaining === 0) sublabel = "Sold out";
  else if (typeof t.remaining === "number" && t.remaining <= 10) sublabel = `${t.remaining} left`;

  return {
    id: t.id,
    name: t.name,
    priceMinor: t.price_cents,
    currency: asCurrency(t.currency),
    remaining: t.remaining,
    perUserLimit: t.per_user_limit ?? null,
    perOrderLimit: t.per_order_limit ?? null,
    salesStatus: t.sales_status ?? null,
    sublabel,
  };
}

export interface CheckoutPricingPlan {
  platform_fixed_cents: number | null;
  platform_percent_bps: number | null;
}

/**
 * Resolve a booking fee in minor units from the pricing plan. Prefers a fixed
 * fee if set; otherwise applies the percentage to subtotal. Callers pass
 * subtotal in cents (sum of `price_cents * qty`).
 */
/** VAT applied to the ticket subtotal in every checkout quote. */
export const CHECKOUT_VAT_RATE = 0.15;

export function bookingFeeFor(plan: CheckoutPricingPlan | null, subtotalCents: number): number {
  if (!plan) return 0;
  if (plan.platform_fixed_cents && plan.platform_fixed_cents > 0) return plan.platform_fixed_cents;
  if (plan.platform_percent_bps && plan.platform_percent_bps > 0) {
    return Math.round((subtotalCents * plan.platform_percent_bps) / 10000);
  }
  return 0;
}
