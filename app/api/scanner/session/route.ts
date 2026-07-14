import { NextResponse } from "next/server"

import { closeDeviceSession, startDeviceSession } from "@/lib/scanning"
import { closeDeviceScannerSession, DeviceScannerAccessError } from "@/lib/scanner/device-session-auth"
import { createServerSupabaseClient } from "@/lib/supabase-server"

async function getScannerUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Supabase is not configured", status: 500 as const }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) return { error: "Failed to verify scanner session", status: 500 as const }
  if (!session) return { error: "Scanner login required", status: 401 as const }

  return { userId: session.user.id }
}

export async function POST(request: Request) {
  const auth = await getScannerUserId()
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const body = await request.json()
  try {
    if (!body.eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 })
    }

    if (!body.deviceId) {
      return NextResponse.json({ error: "deviceId is required" }, { status: 400 })
    }

    const session = await startDeviceSession(String(body.deviceId), String(body.eventId), auth.userId)
    return NextResponse.json(session, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to start session" }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) return NextResponse.json({ error: "Failed to verify scanner session" }, { status: 500 })

  try {
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    const closedSession = session
      ? await closeDeviceSession(String(body.sessionId), session.user.id)
      : await closeDeviceScannerSession({
          sessionId: String(body.sessionId),
          deviceId: body.deviceId ? String(body.deviceId) : null,
          eventId: body.eventId ? String(body.eventId) : null,
        })

    return NextResponse.json(closedSession)
  } catch (error: any) {
    if (error instanceof DeviceScannerAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    return NextResponse.json({ error: error.message ?? "Unable to close session" }, { status: 400 })
  }
}
