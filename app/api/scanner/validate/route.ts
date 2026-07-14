import { NextResponse } from "next/server"

import { validateQrCode } from "@/lib/scanning"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { DeviceScannerAccessError, verifyDeviceScannerAccess } from "@/lib/scanner/device-session-auth"
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

  const body = await request.json().catch(() => ({}))
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

  let deviceAccess: Awaited<ReturnType<typeof verifyDeviceScannerAccess>> | null = null

  if (!session) {
    try {
      deviceAccess = await verifyDeviceScannerAccess({
        eventId: body.eventId ? String(body.eventId) : null,
        deviceId: body.deviceId ? String(body.deviceId) : null,
        sessionId: body.sessionId ? String(body.sessionId) : null,
      })
    } catch (error) {
      const message = error instanceof DeviceScannerAccessError ? error.message : "Scanner login required"
      const status = error instanceof DeviceScannerAccessError ? error.status : 401
      return NextResponse.json(
        {
          valid: false,
          status: "unauthorized",
          message,
        },
        { status },
      )
    }
  }

  const rateKey = session?.user.id ?? `device:${deviceAccess?.deviceId ?? "unknown"}`
  const limit = deviceAccess?.maxScansPerMinute ?? 120
  const rl = await rateLimit("scanner:validate", clientKey(request, rateKey), limit, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  try {
    const result = await validateQrCode({
      code: String(body.code ?? ""),
      eventId: String(body.eventId ?? ""),
      userId: session?.user.id ?? null,
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
