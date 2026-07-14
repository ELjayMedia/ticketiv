import { NextResponse } from "next/server"

import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { claimDeviceSetupCode, DeviceProvisioningError } from "@/lib/scanner/device-provisioning"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const rl = await rateLimit("scanner:provision", clientKey(request), 15, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  const body = await request.json().catch(() => ({}))

  try {
    const setup = await claimDeviceSetupCode({
      code: typeof body.code === "string" ? body.code : "",
      deviceId: typeof body.deviceId === "string" ? body.deviceId : null,
      label: typeof body.label === "string" ? body.label : null,
    })

    return NextResponse.json(setup, { status: 201 })
  } catch (error) {
    if (error instanceof DeviceProvisioningError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Failed to provision scanner device", error)
    return NextResponse.json({ error: "Unable to provision scanner device" }, { status: 500 })
  }
}
