import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET() {
  const deliveryConfigured = Boolean(process.env.OPS_ALERT_WEBHOOK_URL?.trim())

  return NextResponse.json(
    {
      ok: deliveryConfigured,
      service: "ops-alerting",
      deliveryConfigured,
      message: deliveryConfigured
        ? "Operator alert delivery is configured."
        : "Operator alert delivery is not configured.",
      timestamp: new Date().toISOString(),
    },
    { status: deliveryConfigured ? 200 : 503 },
  )
}
