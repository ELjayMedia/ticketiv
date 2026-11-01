/**
 * Client-safe checkout pricing. Kept free of server imports so the ticket
 * picker and checkout screens (client components) can quote totals.
 *
 * The quote must equal what the buyer is charged. The order RPC
 * (`fn_create_inventory_protected_order`) charges the ticket subtotal
 * (`total_cents = subtotal_cents`, platform fee 0, no VAT line), and a promo
 * code is then applied to that total. So buyers see: subtotal − promo.
 * If fees or VAT are ever charged, add them in the RPC first and quote them
 * here from the same source.
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
