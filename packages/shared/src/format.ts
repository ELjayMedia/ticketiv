/**
 * Money + date formatting.
 *
 * All amounts are stored as integer cents in Supabase — `ticket_types.price_cents`,
 * `orders.total_cents`, `order_financials.subtotal_cents`, etc. Callers pass the
 * integer directly; never multiply a float by 100 (avoids "1.10 * 100 = 110.0000…").
 *
 * Currency is parametric so SA expansion (ZAR) doesn't require a screen sweep.
 * Default falls back to SZL when a row has no currency; resolve an active org's
 * preferred currency with `getOrgCurrency()` from lib/currency.ts.
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

/* ──────────────────────────────────────────────────────────────
 * Safe fallback helpers for nullable metadata on consumer
 * surfaces. The UX audit (issue #65) called out blank labels
 * leaking through cards, search results and event detail when
 * a row was missing a venue / price / lineup field. The rule:
 * never render an empty string — either substitute a calm
 * "coming soon" label, or return `null` so the caller can hide
 * the row entirely.
 * ────────────────────────────────────────────────────────────── */

const isPresent = (v: string | null | undefined): v is string =>
  typeof v === "string" && v.trim().length > 0;

/**
 * "Cafe Natarani" / "Venue to be announced".
 * Returns the fallback so cards can keep their layout stable.
 */
export function formatVenueLabel(
  venue: string | null | undefined,
  opts: { fallback?: string } = {}
): string {
  return isPresent(venue) ? venue : opts.fallback ?? "Venue to be announced";
}

/**
 * "Mbabane" / null. City is optional decoration — return null
 * when missing so the dot separator can be elided.
 */
export function formatCityLabel(city: string | null | undefined): string | null {
  return isPresent(city) ? city : null;
}

/**
 * "From E500" / "Free" / "Price coming soon".
 * `null` minor units → fallback label (never a blank chip).
 */
export function formatPriceLabel(
  minorUnits: number | null | undefined,
  currency: Currency = "SZL",
  opts: { prefix?: string; freeLabel?: string; fallback?: string } = {}
): string {
  if (minorUnits === null || minorUnits === undefined) {
    return opts.fallback ?? "Price coming soon";
  }
  if (minorUnits === 0) return opts.freeLabel ?? "Free";
  const base = formatPrice(minorUnits, currency);
  return opts.prefix ? `${opts.prefix} ${base}` : base;
}

/**
 * "DJ Fun + Riya M." / "Lineup announcement coming soon".
 */
export function formatLineupLabel(
  names: ReadonlyArray<string | null | undefined> | null | undefined,
  opts: { fallback?: string; maxNames?: number } = {}
): string {
  const clean = (names ?? []).filter(isPresent);
  if (clean.length === 0) return opts.fallback ?? "Lineup announcement coming soon";
  const max = opts.maxNames ?? 3;
  if (clean.length <= max) return clean.join(" + ");
  return `${clean.slice(0, max).join(" + ")} + ${clean.length - max} more`;
}

/**
 * "234 going" / "12 going" / null when count is 0 or unknown.
 * Caller decides whether to render — we never show "0 going".
 */
export function formatGoingCount(
  count: number | null | undefined
): string | null {
  if (typeof count !== "number" || count <= 0) return null;
  return `${formatCompactCount(count)} going`;
}

/**
 * "1.2k sold" / "12 sold" / null. Below `min` (default 5)
 * we hide the signal to avoid manufacturing fake momentum.
 */
export function formatSoldCount(
  count: number | null | undefined,
  opts: { min?: number } = {}
): string | null {
  const min = opts.min ?? 5;
  if (typeof count !== "number" || count < min) return null;
  return `${formatCompactCount(count)} sold`;
}

/**
 * "12 tickets sold today" / null. Mirrors formatSoldCount but
 * with a "today" qualifier for the purchase-activity ribbon.
 */
export function formatRecentSoldLabel(
  count: number | null | undefined,
  opts: { min?: number; windowLabel?: string } = {}
): string | null {
  const min = opts.min ?? 3;
  if (typeof count !== "number" || count < min) return null;
  const window = opts.windowLabel ?? "today";
  return `${formatCompactCount(count)} ticket${count === 1 ? "" : "s"} sold ${window}`;
}

/** "Only 5 left" / null. Caller chooses the threshold. */
export function formatScarcityLabel(
  remaining: number | null | undefined,
  opts: { threshold?: number } = {}
): string | null {
  const threshold = opts.threshold ?? 10;
  if (typeof remaining !== "number" || remaining <= 0 || remaining > threshold) {
    return null;
  }
  return `Only ${remaining} left`;
}

/** 1234 → "1.2k" · 999 → "999" · 12_345 → "12k" */
export function formatCompactCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 10_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (count < 1_000_000) return `${Math.round(count / 1000)}k`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
