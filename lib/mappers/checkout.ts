/**
 * Map Supabase event + ticket_types + pricing_plan into the shapes the
 * checkout screens consume. Pricing math (subtotal, fees, VAT, total) lives
 * inside the screen components — we just hand them the inputs.
 */

import { PHOTOS } from "@/lib/photos";
import { formatEventDate, formatTimeRange } from "@/lib/format";
import type { EventPublicView } from "@/lib/schemas/views";

export interface CheckoutTicketTypeRow {
  id: string;
  name: string;
  price_cents: number;
  quota: number | null;
  sales_status?: string | null;
}

export interface CheckoutTicketTypeProp {
  id: string;
  name: string;
  priceMinor: number;
  remaining: number | null;
  sublabel?: string;
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
  else if (t.quota === 0) sublabel = "Sold out";
  else if (typeof t.quota === "number" && t.quota <= 10) sublabel = `${t.quota} left`;

  return {
    id: t.id,
    name: t.name,
    priceMinor: t.price_cents,
    remaining: t.quota,
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
export function bookingFeeFor(plan: CheckoutPricingPlan | null, subtotalCents: number): number {
  if (!plan) return 0;
  if (plan.platform_fixed_cents && plan.platform_fixed_cents > 0) return plan.platform_fixed_cents;
  if (plan.platform_percent_bps && plan.platform_percent_bps > 0) {
    return Math.round((subtotalCents * plan.platform_percent_bps) / 10000);
  }
  return 0;
}
