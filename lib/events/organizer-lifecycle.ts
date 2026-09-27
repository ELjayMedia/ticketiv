import { isEventPast } from "@/lib/events/lifecycle"

export type OrganizerEventLifecycle =
  | "active"
  | "upcoming"
  | "past"
  | "draft"
  | "archived"
  | "paused"

export function resolveOrganizerEventLifecycle(
  event: { status: string; starts_at: string | null; ends_at?: string | null },
  finalOccurrenceEnd: string | null,
  nowMs: number = Date.now(),
): OrganizerEventLifecycle {
  if (event.status === "draft") return "draft"
  if (event.status === "archived") return "archived"
  if (event.status === "paused") return "paused"

  if (
    isEventPast({
      eventStartsAt: event.starts_at,
      eventEndsAt: finalOccurrenceEnd ?? event.ends_at ?? null,
      nowMs,
    })
  ) {
    return "past"
  }

  const startMs = event.starts_at
    ? new Date(event.starts_at).getTime()
    : Number.POSITIVE_INFINITY

  if (event.status === "published" && startMs <= nowMs) return "active"
  return "upcoming"
}
