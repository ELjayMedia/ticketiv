export const EVENT_END_GRACE_MS = 3 * 60 * 60 * 1000;

export type EventLifecycleState = "draft" | "upcoming" | "live" | "ended" | "cancelled";

type EventLifecycleWindow = {
  status?: string | null;
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
 * Canonical event lifecycle contract.
 *
 * Schedule drives Upcoming / Live / Ended. A ticket scan is intentionally not
 * an input. Explicit Draft and Cancelled states override time-derived state.
 * The end timestamp should represent the final event_dates occurrence.
 */
export function deriveEventLifecycle({
  status,
  eventStartsAt,
  eventEndsAt,
  nowMs = Date.now(),
  graceMs = EVENT_END_GRACE_MS,
}: EventLifecycleWindow): EventLifecycleState {
  const normalizedStatus = status?.trim().toLowerCase();
  if (normalizedStatus === "draft") return "draft";
  if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") return "cancelled";

  const start = timestamp(eventStartsAt);
  const end = timestamp(eventEndsAt) ?? start;

  if (start !== null && nowMs < start) return "upcoming";
  if (end !== null && nowMs > end + graceMs) return "ended";

  // Undated published/paused events remain discoverable rather than being
  // guessed into history; once an actual start/end is known this becomes live.
  return "live";
}

export function isEventPast(input: EventLifecycleWindow): boolean {
  return deriveEventLifecycle(input) === "ended";
}
