const HOUR_MS = 60 * 60 * 1000;
const POST_EVENT_GRACE_MS = 48 * HOUR_MS;
const UNKNOWN_EVENT_TTL_MS = 7 * 24 * HOUR_MS;

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Offline QR copies expire shortly after the event. The event end is preferred;
 * the advertised start is the fallback when the view has no end time.
 */
export function resolveOfflineTicketExpiry({
  eventEndsAt,
  eventStartsAt,
  now = Date.now(),
}: {
  eventEndsAt?: string | null;
  eventStartsAt?: string | null;
  now?: number;
}): string {
  const eventBoundary = timestamp(eventEndsAt) ?? timestamp(eventStartsAt);
  const expiresAt = eventBoundary === null
    ? now + UNKNOWN_EVENT_TTL_MS
    : eventBoundary + POST_EVENT_GRACE_MS;

  return new Date(expiresAt).toISOString();
}
