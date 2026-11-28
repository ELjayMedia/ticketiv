/**
 * Resale price cap resolution.
 *
 * Cap is expressed in basis points of face value: 10000 = 100%, 11000 = 110%.
 * Source of truth, in priority order:
 *   1. events.resale_cap_bps (per-event override; nullable)
 *   2. RESALE_CAP_BPS_DEFAULT (platform constant, below)
 *
 * `capForListing()` returns the maximum listing price in cents for a given
 * ticket face value, given an optional per-event override.
 */

export const RESALE_CAP_BPS_DEFAULT = 11000; // 110%

export function resolveResaleCapBps(eventOverride: number | null | undefined): number {
  if (typeof eventOverride === "number" && eventOverride >= 0) return eventOverride;
  return RESALE_CAP_BPS_DEFAULT;
}

export function capForListing(faceValueCents: number, eventOverride: number | null | undefined): number {
  const bps = resolveResaleCapBps(eventOverride);
  return Math.floor((faceValueCents * bps) / 10000);
}

export function isListingPriceAllowed(
  proposedCents: number,
  faceValueCents: number,
  eventOverride: number | null | undefined,
): boolean {
  return proposedCents >= 0 && proposedCents <= capForListing(faceValueCents, eventOverride);
}

/** The database enforces the organiser's cap (TICK-448) and returns the maximum in cents. */
export function resaleCapMessage(details: string | null | undefined): string {
  const max = Number.parseInt(String(details ?? ""), 10)
  if (!Number.isFinite(max) || max <= 0) {
    return "This ticket can't be resold for money. The organiser doesn't allow resale above face value for it."
  }
  return `The organiser caps resale for this ticket at ${(max / 100).toFixed(2)}. Lower your price and try again.`
}
