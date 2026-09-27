import { resolveEventLifecycle } from "@/lib/events/lifecycle"

type SeriesLifecycleEvent = {
  starts_at: string | null
  ends_at?: string | null
  lifecycle_end_at?: string | null
  status?: string | null
}

export function partitionSeriesEvents<T extends SeriesLifecycleEvent>(
  events: T[],
  nowMs: number = Date.now(),
): { upcoming: T[]; past: T[] } {
  const upcoming: T[] = []
  const past: T[] = []

  for (const event of events) {
    const lifecycle = resolveEventLifecycle({
      eventStartsAt: event.starts_at,
      eventEndsAt: event.lifecycle_end_at ?? event.ends_at ?? null,
      eventStatus: event.status,
      nowMs,
    })

    if (lifecycle === "upcoming" || lifecycle === "live") {
      upcoming.push(event)
    } else {
      past.push(event)
    }
  }

  past.reverse()
  return { upcoming, past }
}
