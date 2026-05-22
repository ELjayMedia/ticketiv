/**
 * Money + date formatting.
 *
 * All amounts are stored as minor units (cents) in Supabase
 * — `order_items.unit_price_minor` etc. — so callers always
 * pass an integer, never a float. This avoids the classic
 * "1.10 * 100 = 110.00000001" trap.
 *
 * Currency is parametric so the SA expansion (ZAR) doesn't
 * require a sweep through every screen.
 */

export type Currency = "SZL" | "ZAR" | "USD" | "EUR" | "GBP";

const CURRENCY_SYMBOL: Record<Currency, string> = {
  SZL: "E", // emalangeni — Eswatini
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/**
 * Format minor-unit money for the UI.
 *
 *   formatPrice(50000)            → "E500"
 *   formatPrice(101800)           → "E1,018"
 *   formatPrice(0)                → "Free"
 *   formatPrice(50000, "ZAR")     → "R500"
 *   formatPrice(101800, "SZL", { decimals: true }) → "E1,018.00"
 */
export function formatPrice(
  minorUnits: number,
  currency: Currency = "SZL",
  opts: { decimals?: boolean; freeLabel?: string } = {}
): string {
  if (minorUnits === 0) return opts.freeLabel ?? "Free";

  const major = minorUnits / 100;
  const formatted = opts.decimals
    ? major.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : Math.round(major).toLocaleString("en-US");

  return `${CURRENCY_SYMBOL[currency]}${formatted}`;
}

/**
 * "Fri 25 → Sun 27 Jul" for multi-day, "Wed 30 Aug" for single.
 */
export function formatEventDate(
  start: Date | string,
  end?: Date | string | null
): string {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = end ? (typeof end === "string" ? new Date(end) : end) : null;

  const sameDay =
    !e ||
    (s.getFullYear() === e.getFullYear() &&
      s.getMonth() === e.getMonth() &&
      s.getDate() === e.getDate());

  const day = (d: Date) =>
    d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
  const month = (d: Date) =>
    d.toLocaleDateString("en-GB", { month: "short" });

  if (sameDay) return `${day(s)} ${month(s)}`;
  return `${day(s)} → ${day(e!)} ${month(e!)}`;
}

/**
 * "15:50 → 17:50" (24h, no seconds).
 */
export function formatTimeRange(
  start: Date | string,
  end?: Date | string | null
): string {
  const fmt = (d: Date) =>
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  const s = typeof start === "string" ? new Date(start) : start;
  const e = end ? (typeof end === "string" ? new Date(end) : end) : null;
  return e ? `${fmt(s)} → ${fmt(e)}` : fmt(s);
}

/**
 * "8:42" — used by the hold-timer badge in checkout.
 */
export function formatHoldTimer(secondsRemaining: number): string {
  const m = Math.max(0, Math.floor(secondsRemaining / 60));
  const s = Math.max(0, secondsRemaining % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
