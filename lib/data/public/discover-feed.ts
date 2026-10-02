import { getPublicEventsList } from "@/lib/adapters/events"
import { DISCOVER_WEEK_MS, mapDiscoverEvent, pickEditorPick, type DiscoverEvent } from "@/lib/mappers/discover"

/**
 * Discover feed: "This week" (not ended, starting within 7 days — includes tonight and events already
 * under way) and "Upcoming" (every published event starting after that). Together they cover every
 * event that has not taken place yet. No location filter is applied.
 */
export type DiscoverSectionKey = "thisWeek" | "upcoming"

export interface DiscoverSection {
  events: DiscoverEvent[]
  hasMore: boolean
}

export function discoverSectionWindow(section: DiscoverSectionKey, nowMs: number) {
  const weekEnd = new Date(nowMs + DISCOVER_WEEK_MS).toISOString()
  return section === "thisWeek" ? { startsBefore: weekEnd } : { startsAfter: weekEnd }
}

export async function getDiscoverSection(
  section: DiscoverSectionKey,
  options: { limit: number; offset?: number; category?: string; nowMs?: number },
): Promise<DiscoverSection> {
  const nowMs = options.nowMs ?? Date.now()
  // Fetch one extra row so hasMore is exact.
  const rows = await getPublicEventsList({
    limit: options.limit + 1,
    offset: options.offset ?? 0,
    sort: "soonest",
    category: options.category,
    lifecycle: "current",
    nowMs,
    ...discoverSectionWindow(section, nowMs),
  })
  return { events: rows.slice(0, options.limit).map(mapDiscoverEvent), hasMore: rows.length > options.limit }
}

export async function getDiscoverFeed(nowMs: number = Date.now()) {
  const [thisWeek, upcoming] = await Promise.all([
    getDiscoverSection("thisWeek", { limit: 12, nowMs }),
    getDiscoverSection("upcoming", { limit: 9, nowMs }),
  ])
  return { thisWeek, upcoming, editorPick: pickEditorPick([...thisWeek.events, ...upcoming.events]) }
}
