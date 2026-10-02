import { NextRequest, NextResponse } from "next/server"
import { getPublicEventsList } from "@/lib/adapters/events"
import { getDiscoverSection } from "@/lib/data/public/discover-feed"
import { mapDiscoverEvent } from "@/lib/mappers/discover"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0)
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "9", 10) || 9, 1), 36)
  const category = searchParams.get("category") ?? undefined
  const when = searchParams.get("when") ?? undefined
  const lifecycle =
    searchParams.get("past") === "1" || when === "past"
      ? "past" as const
      : "current" as const
  const now = Date.now()

  // Discover sections share their windows with the server-rendered page (lib/data/public/discover-feed).
  if (lifecycle === "current" && (when === "thisWeek" || when === "upcoming")) {
    return NextResponse.json(await getDiscoverSection(when, { limit, offset, category, nowMs: now }))
  }

  // Fetch one extra lifecycle-filtered row so hasMore is exact.
  const rows = await getPublicEventsList({
    limit: limit + 1,
    offset,
    sort: lifecycle === "past" ? "latest" : "soonest",
    category,
    lifecycle,
    nowMs: now,
  })

  return NextResponse.json({
    events: rows.slice(0, limit).map(mapDiscoverEvent),
    hasMore: rows.length > limit,
  })
}
