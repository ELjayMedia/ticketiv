/**
 * Client-safe checkout pricing: cart lines, booking fee and VAT. Kept free
 * of server imports so the ticket picker and checkout screens (client
 * components) can quote the same totals the server computes.
 */

import type { Currency } from "@/lib/format";

/** A priced cart line, ready for the checkout summary. */
export interface CheckoutCartLine {
  ticketTypeId: string;
  name: string;
  priceMinor: number;
  currency: Currency;
  quantity: number;
}

export interface CheckoutPricingPlan {
  platform_fixed_cents: number | null;
  platform_percent_bps: number | null;
}

/** VAT applied to the ticket subtotal in every checkout quote. */
export const CHECKOUT_VAT_RATE = 0.15;

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

export function cartSubtotalMinor(lines: ReadonlyArray<CheckoutCartLine>): number {
  return lines.reduce((sum, l) => sum + l.priceMinor * l.quantity, 0);
}
