import { NextResponse } from "next/server"

import { validateQrCode } from "@/lib/scanning"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    return NextResponse.json(
      {
        valid: false,
        status: "error",
        message: "Supabase is not configured",
      },
      { status: 500 },
    )
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    return NextResponse.json(
      {
        valid: false,
        status: "error",
        message: "Failed to verify scanner session",
      },
      { status: 500 },
    )
  }

  if (!session) {
    return NextResponse.json(
      {
        valid: false,
        status: "unauthorized",
        message: "Scanner login required",
      },
      { status: 401 },
    )
  }

  const rl = await rateLimit("scanner:validate", clientKey(request, session.user.id), 120, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  const body = await request.json()

  try {
    const result = await validateQrCode({
      code: String(body.code ?? ""),
      eventId: String(body.eventId ?? ""),
      userId: session.user.id,
      deviceId: body.deviceId ? String(body.deviceId) : null,
      sessionId: body.sessionId ? String(body.sessionId) : null,
      gate: body.gate ? String(body.gate) : null,
      offline: Boolean(body.offline),
      scannedAt: body.scannedAt ? String(body.scannedAt) : undefined,
    })

    const status = result.valid
      ? 200
      : result.status === "not_found"
        ? 404
        : result.status === "unauthorized"
          ? 403
          : result.status === "error"
            ? 400
            : 409

    return NextResponse.json(result, { status })
  } catch (error: any) {
    console.error("Failed to validate QR code", error)

    return NextResponse.json(
      {
        valid: false,
        status: "error",
        message: error?.message ?? "Scan failed",
      },
      { status: 400 },
    )
  }
}
