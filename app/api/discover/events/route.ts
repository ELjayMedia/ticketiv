import { NextRequest, NextResponse } from "next/server"
import { getPublicEventsList } from "@/lib/adapters/events"
import { mapDiscoverEvent } from "@/lib/mappers/discover"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const offset = parseInt(searchParams.get("offset") ?? "0", 10)
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "9", 10), 36)
  const category = searchParams.get("category") ?? undefined
  const when = searchParams.get("when") ?? undefined
  const lifecycle =
    searchParams.get("past") === "1" || when === "past"
      ? "past" as const
      : "current" as const

  const now = Date.now()
  const sixHours = 6 * 60 * 60 * 1000
  const sevenDays = 7 * 24 * 60 * 60 * 1000

  let startsAfter: string | undefined
  let startsBefore: string | undefined

  if (lifecycle === "current" && when === "tonight") {
    startsAfter = new Date(now).toISOString()
    startsBefore = new Date(now + sixHours).toISOString()
  } else if (lifecycle === "current" && when === "thisWeek") {
    startsAfter = new Date(now + sixHours).toISOString()
    startsBefore = new Date(now + sevenDays).toISOString()
  }

  // Fetch one extra lifecycle-filtered row so hasMore is exact.
  const rows = await getPublicEventsList({
    limit: limit + 1,
    offset,
    sort: lifecycle === "past" ? "latest" : "soonest",
    category,
    startsAfter,
    startsBefore,
    lifecycle,
    nowMs: now,
  })

  return NextResponse.json({
    events: rows.slice(0, limit).map(mapDiscoverEvent),
    hasMore: rows.length > limit,
  })
}
