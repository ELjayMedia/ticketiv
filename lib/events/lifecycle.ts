export const EVENT_END_GRACE_MS = 3 * 60 * 60 * 1000;

export type EventLifecycle = "upcoming" | "live" | "ended" | "cancelled";

export type EventLifecycleWindow = {
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  eventStatus?: string | null;
  nowMs?: number;
  graceMs?: number;
};

function timestamp(value?: string | null): number | null {
  if (!value) return null;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Canonical Ticketiv event lifecycle.
 *
 * - explicit cancellation always wins over schedule
 * - Upcoming lasts until the event begins
 * - Live includes the operational grace window after the final occurrence
 * - Ended begins only after final occurrence end + grace
 *
 * Callers should pass eventEndsAt as the final event_dates occurrence end.
 * Ticket ownership/check-in state is intentionally not an input.
 */
export function resolveEventLifecycle({
  eventStartsAt,
  eventEndsAt,
  eventStatus,
  nowMs = Date.now(),
  graceMs = EVENT_END_GRACE_MS,
}: EventLifecycleWindow): EventLifecycle {
  if (eventStatus === "cancelled") return "cancelled";

  const start = timestamp(eventStartsAt);
  const end = timestamp(eventEndsAt) ?? start;

  if (start === null && end === null) return "upcoming";
  if (start !== null && nowMs < start) return "upcoming";

  if (end !== null && nowMs > end + graceMs) return "ended";

  return "live";
}

export function isEventPast(input: EventLifecycleWindow): boolean {
  return resolveEventLifecycle(input) === "ended";
}
