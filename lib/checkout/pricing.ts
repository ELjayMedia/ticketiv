/**
 * Client-safe checkout pricing. Kept free of server imports so the ticket
 * picker and checkout screens (client components) can quote the same total
 * the order RPC charges: the ticket subtotal, less any promo. Platform fees
 * are deducted from the organizer at settlement, never added for buyers.
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

/** Preview discount for a validated promo; the order RPC stays authoritative. */
export function promoDiscountMinor(
  subtotalMinor: number,
  promo: { discountType: "percent" | "fixed"; discountValue: number } | null,
): number {
  if (!promo) return 0;
  const raw =
    promo.discountType === "percent"
      ? Math.round((subtotalMinor * promo.discountValue) / 100)
      : promo.discountValue;
  return Math.max(0, Math.min(subtotalMinor, raw));
}
