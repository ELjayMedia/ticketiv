/**
 * Ticketiv's platform fee: one platform-wide rate, a percentage of each
 * ticket's price plus an optional fixed amount per ticket. It is taken from
 * the organizer's payout; buyers pay only the ticket price.
 *
 * The database is the source of truth (public.platform_fee_settings and the
 * order trigger app.recompute_order_totals). This module mirrors that math
 * so the super-admin preview and the organizer's pricing page quote exactly
 * what will be deducted:
 *   fee per ticket = min(price, round(price × percent_bps / 10000) + fixed)
 *   free tickets pay nothing.
 *
 * Client-safe: no server imports.
 */

import { formatPrice, type Currency } from "@/lib/format";

export interface PlatformFeeRate {
  percentBps: number;
  fixedPerTicketCents: number;
  currency: Currency;
}

export const NO_PLATFORM_FEE: PlatformFeeRate = { percentBps: 0, fixedPerTicketCents: 0, currency: "SZL" };

/** The fee on one ticket of the given price, in minor units. */
export function ticketFeeCents(priceCents: number, rate: PlatformFeeRate): number {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return 0;
  const percentPart = Math.round((priceCents * rate.percentBps) / 10000);
  return Math.min(priceCents, percentPart + rate.fixedPerTicketCents);
}

/** What the organizer receives for one ticket after the platform fee. */
export function organizerNetPerTicketCents(priceCents: number, rate: PlatformFeeRate): number {
  return Math.max(0, priceCents - ticketFeeCents(priceCents, rate));
}

export function formatPercentBps(bps: number): string {
  const pct = bps / 100;
  return `${Number.isInteger(pct) ? pct.toFixed(0) : pct.toFixed(2).replace(/0$/, "")}%`;
}

/** "5% + E2.00 per ticket", "5% per ticket", "E2.00 per ticket" or "No fee". */
export function formatPlatformFeeRate(rate: PlatformFeeRate): string {
  const parts: string[] = [];
  if (rate.percentBps > 0) parts.push(formatPercentBps(rate.percentBps));
  if (rate.fixedPerTicketCents > 0) {
    parts.push(formatPrice(rate.fixedPerTicketCents, rate.currency, { decimals: true }));
  }
  return parts.length ? `${parts.join(" + ")} per ticket` : "No fee";
}

/** Row shape of public.platform_fee_settings → rate. */
export function rateFromSettingRow(
  row: { percent_bps: number; fixed_per_ticket_cents: number; currency: string } | null | undefined,
): PlatformFeeRate {
  if (!row) return NO_PLATFORM_FEE;
  return {
    percentBps: row.percent_bps,
    fixedPerTicketCents: row.fixed_per_ticket_cents,
    currency: (row.currency as Currency) ?? "SZL",
  };
}
