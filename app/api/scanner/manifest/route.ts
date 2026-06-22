import { NextResponse, type NextRequest } from "next/server"

import { loadScannerManifest } from "@/lib/scanning"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: "Scanner login required" }, { status: 401 })
  }

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim()
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 })
  }

  const since = request.nextUrl.searchParams.get("since")?.trim() || undefined

  try {
    const items = await loadScannerManifest(eventId, session.user.id, since)
    return NextResponse.json({
      eventId,
      fetchedAt: new Date().toISOString(),
      items,
    })
  } catch (error: any) {
    const message = error?.message ?? "Unable to load manifest"
    const status = message.includes("authorized") ? 403 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
