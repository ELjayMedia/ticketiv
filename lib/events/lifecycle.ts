export const EVENT_END_GRACE_MS = 3 * 60 * 60 * 1000;

type EventLifecycleWindow = {
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  nowMs?: number;
  graceMs?: number;
};

function timestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Returns true only when there is enough schedule evidence that the event
 * has finished and the operational grace window has elapsed.
 *
 * The canonical end time should be the final event_dates occurrence. Until
 * every consumer exposes that value, eventStartsAt is a conservative fallback.
 * Ticket scan/check-in state is deliberately not part of this calculation.
 */
export function isEventPast({
  eventStartsAt,
  eventEndsAt,
  nowMs = Date.now(),
  graceMs = EVENT_END_GRACE_MS,
}: EventLifecycleWindow): boolean {
  const canonicalEnd = timestamp(eventEndsAt) ?? timestamp(eventStartsAt);
  if (canonicalEnd === null) return false;

  return nowMs > canonicalEnd + graceMs;
}
