import { NextResponse } from "next/server"

import { DeviceScannerAccessError, verifyDeviceScannerAccess } from "@/lib/scanner/device-session-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 100

export async function GET(request: Request) {
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const url = new URL(request.url)
  const eventId = url.searchParams.get("eventId")?.trim()
  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    try {
      await verifyDeviceScannerAccess({
        eventId,
        deviceId: url.searchParams.get("deviceId"),
        sessionId: url.searchParams.get("sessionId"),
      })
    } catch (error) {
      const message = error instanceof DeviceScannerAccessError ? error.message : "Scanner login required"
      const status = error instanceof DeviceScannerAccessError ? error.status : 401
      return NextResponse.json({ error: message }, { status })
    }
  }

  const limitParam = Number(url.searchParams.get("limit") ?? DEFAULT_LIMIT)
  const limit = Number.isFinite(limitParam) ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(limitParam))) : DEFAULT_LIMIT

  const db = session ? supabase : createAdminClient()
  const { data, error } = await db
    .from("scans")
    .select("id, ticket_code, outcome, scanned_at")
    .eq("event_id", eventId)
    .order("scanned_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Failed to load recent scans", error)
    return NextResponse.json({ error: "Unable to load scans" }, { status: 500 })
  }

  return NextResponse.json({ scans: data ?? [] })
}
