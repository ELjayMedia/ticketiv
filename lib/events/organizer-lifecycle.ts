import { deriveEventLifecycle } from "@/lib/events/lifecycle";

export type OrganizerEventLifecycle =
  | "active"
  | "upcoming"
  | "past"
  | "cancelled"
  | "draft"
  | "archived"
  | "paused";

export function resolveOrganizerEventLifecycle(
  event: {
    status: string;
    starts_at: string | null;
    ends_at?: string | null;
    cancelled_at?: string | null;
  },
  finalOccurrenceEnd: string | null,
  nowMs: number = Date.now(),
): OrganizerEventLifecycle {
  if (event.cancelled_at || event.status === "cancelled") return "cancelled";
  if (event.status === "draft") return "draft";
  if (event.status === "archived") return "archived";
  if (event.status === "paused") return "paused";

  const lifecycle = deriveEventLifecycle({
    status: event.status,
    eventStartsAt: event.starts_at,
    eventEndsAt: finalOccurrenceEnd ?? event.ends_at ?? null,
    nowMs,
  });

  if (lifecycle === "ended") return "past";
  if (lifecycle === "upcoming") return "upcoming";
  return "active";
}
