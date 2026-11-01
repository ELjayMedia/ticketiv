/**
 * Client-safe checkout pricing. Kept free of server imports so the ticket
 * picker and checkout screens (client components) can quote totals.
 *
 * The quote must equal what the buyer is charged. The order RPC
 * (`fn_create_inventory_protected_order`) charges the ticket subtotal, and
 * a promo code is then applied to that total. So buyers see: subtotal − promo.
 * Ticketiv's platform fee is not added for buyers: it is deducted from the
 * organizer's payout (see lib/fees/platform-fee.ts). If a buyer-side fee or
 * VAT is ever charged, add it in the database first and quote it here from
 * the same source.
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

export function cartSubtotalMinor(lines: ReadonlyArray<CheckoutCartLine>): number {
  return lines.reduce((sum, l) => sum + l.priceMinor * l.quantity, 0);
}

/** What the buyer pays: the subtotal less any discounts, never below zero. */
export function checkoutTotalMinor(subtotalMinor: number, discountsMinor: number): number {
  return Math.max(0, subtotalMinor - discountsMinor);
}
