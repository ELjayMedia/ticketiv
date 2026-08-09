import { NextResponse } from "next/server"

import { syncOfflineScans } from "@/lib/scanning"
import { DeviceScannerAccessError, verifyDeviceScannerAccess } from "@/lib/scanner/device-session-auth"
import { getVerifiedScannerRequestUser } from "@/lib/scanner/request-auth"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const body = await request.json().catch(() => ({}))
  const scans = Array.isArray(body.scans) ? body.scans : []

  const auth = await getVerifiedScannerRequestUser(supabase)

  if (auth.error) {
    return NextResponse.json({ error: "Failed to verify scanner session" }, { status: 500 })
  }

  if (!auth.user && scans.length > 0) {
    const first = scans[0]
    const sameSession = scans.every(
      (scan: any) =>
        scan?.eventId === first?.eventId &&
        scan?.deviceId === first?.deviceId &&
        scan?.sessionId === first?.sessionId,
    )

    if (!sameSession) {
      return NextResponse.json({ error: "Offline scans must belong to one device session" }, { status: 400 })
    }

    try {
      await verifyDeviceScannerAccess({
        eventId: first?.eventId ? String(first.eventId) : null,
        deviceId: first?.deviceId ? String(first.deviceId) : null,
        sessionId: first?.sessionId ? String(first.sessionId) : null,
      })
    } catch (error) {
      const message = error instanceof DeviceScannerAccessError ? error.message : "Scanner login required"
      const status = error instanceof DeviceScannerAccessError ? error.status : 401
      return NextResponse.json({ error: message }, { status })
    }
  }

  try {
    const result = await syncOfflineScans(scans, auth.user?.id ?? null)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to sync scans" }, { status: 400 })
  }
}
