import { NextResponse } from "next/server"

import { validateQrCode, validateTapBandCredential, type ScannerValidationStatus } from "@/lib/scanning"
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
    const isTapBandScan =
      String(body.mode ?? body.inputMode ?? "").toLowerCase() === "tapband" ||
      body.credentialPublicId != null

    const result = isTapBandScan
      ? await validateTapBandCredential({
          credentialPublicId: String(body.credentialPublicId ?? body.code ?? ""),
          eventId: String(body.eventId ?? ""),
          userId: session?.user.id ?? null,
          deviceId: body.deviceId ? String(body.deviceId) : null,
          sessionId: body.sessionId ? String(body.sessionId) : null,
          gate: body.gate ? String(body.gate) : null,
          scannedAt: body.scannedAt ? String(body.scannedAt) : undefined,
          attemptId: body.attemptId ? String(body.attemptId) : null,
        })
      : await validateQrCode({
          code: String(body.code ?? ""),
          eventId: String(body.eventId ?? ""),
          userId: session?.user.id ?? null,
          deviceId: body.deviceId ? String(body.deviceId) : null,
          sessionId: body.sessionId ? String(body.sessionId) : null,
          gate: body.gate ? String(body.gate) : null,
          offline: Boolean(body.offline),
          scannedAt: body.scannedAt ? String(body.scannedAt) : undefined,
        })

    const status = statusCodeForScannerResult(result.valid, result.status)

    return NextResponse.json(result, { status })
  } catch (error: any) {
    console.error("Failed to validate scanner code", error)

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

function statusCodeForScannerResult(valid: boolean, status: ScannerValidationStatus) {
  if (valid) return 200

  switch (status) {
    case "not_found":
    case "tapband_unknown":
      return 404
    case "unauthorized":
      return 403
    case "error":
    case "tapband_reader_error":
      return 400
    case "tapband_multiple_entitlements":
      return 409
    case "tapband_no_entitlement":
    case "tapband_lost":
    case "tapband_replaced":
    case "tapband_unsupported_chip":
    case "tapband_unauthenticated_chip":
    case "wrong_event":
    case "revoked":
    case "refunded":
    case "transferred":
    case "not_paid":
      return 422
    default:
      return 409
  }
}
