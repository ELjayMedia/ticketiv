import { NextResponse } from "next/server"

import { validateQrCode } from "@/lib/scanning"

export async function POST(request: Request) {
  const body = await request.json()

  try {
    const result = await validateQrCode({
      code: String(body.code ?? ""),
      deviceId: String(body.deviceId ?? "web"),
      sessionId: body.sessionId ? String(body.sessionId) : undefined,
      location: body.location ? String(body.location) : undefined,
      offline: Boolean(body.offline),
      scannedAt: body.scannedAt ? String(body.scannedAt) : undefined,
    })

    const status = result.valid ? 200 : result.status === "not_found" ? 404 : 409
    return NextResponse.json(result, { status })
  } catch (error: any) {
    console.error("Failed to validate QR code", error)
    return NextResponse.json({ valid: false, status: "error", message: error.message ?? "Scan failed" }, { status: 400 })
  }
}
