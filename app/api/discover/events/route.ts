import { NextRequest, NextResponse } from "next/server"
import { getPublicEventsList } from "@/lib/adapters/events"
import { mapDiscoverEvent } from "@/lib/mappers/discover"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "9", 10), 36)
  const category = searchParams.get("category") ?? undefined
  const when = searchParams.get("when") ?? undefined

  const rows = await getPublicEventsList({
    limit,
    offset,
    sort: "soonest",
    category,
  })

  // Apply "when" filter in-process (matches partition logic in discover.ts)
  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  const mapped = rows.map(mapDiscoverEvent)
  const filtered =
    when === "tonight"
      ? mapped.filter(
          (e) =>
            e.startsAtMs !== null &&
            e.startsAtMs - now >= 0 &&
            e.startsAtMs - now <= sixHours,
        )
      : when === "thisWeek"
        ? mapped.filter(
            (e) =>
              e.startsAtMs !== null &&
              e.startsAtMs - now > sixHours &&
              e.startsAtMs - now <= sevenDays,
          )
        : mapped

  return NextResponse.json({
    events: filtered,
    hasMore: rows.length === limit,
  })
}
