import { NextResponse, type NextRequest } from "next/server"

import { loadScannerManifest, loadScannerManifestForDevice } from "@/lib/scanning"
import { DeviceScannerAccessError } from "@/lib/scanner/device-session-auth"
import { getVerifiedScannerRequestUser } from "@/lib/scanner/request-auth"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const auth = await getVerifiedScannerRequestUser(supabase)
  if (auth.error) {
    return NextResponse.json({ error: "Failed to verify scanner session" }, { status: 500 })
  }

  const eventId = request.nextUrl.searchParams.get("eventId")?.trim()
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 })
  }

  const since = request.nextUrl.searchParams.get("since")?.trim() || undefined
  const deviceId = request.nextUrl.searchParams.get("deviceId")?.trim() || ""
  const sessionId = request.nextUrl.searchParams.get("sessionId")?.trim() || ""

  try {
    const items = auth.user
      ? await loadScannerManifest(eventId, auth.user.id, since)
      : await loadScannerManifestForDevice(eventId, deviceId, sessionId, since)

    return NextResponse.json({
      eventId,
      fetchedAt: new Date().toISOString(),
      items,
    })
  } catch (error: any) {
    const message = error?.message ?? "Unable to load manifest"
    const status = error instanceof DeviceScannerAccessError
      ? error.status
      : message.includes("authorized")
        ? 403
        : 400
    return NextResponse.json({ error: message }, { status })
  }
}
