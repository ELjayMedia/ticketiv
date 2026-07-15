import { NextResponse } from "next/server"

import {
  fetchTapBandAccessDecision,
  safeTapBandConfigPayload,
  TAPBAND_CAPABILITIES,
  type TapBandCapability,
} from "@/lib/tapband/config"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const expectedSecret = process.env.TAPBAND_CONFIG_SECRET
  const authHeader = request.headers.get("authorization")
  const keyHeader = request.headers.get("x-tapband-config-secret")

  if (!expectedSecret || (authHeader !== `Bearer ${expectedSecret}` && keyHeader !== expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const capability = parseCapability(url.searchParams.get("capability"))

  try {
    const decision = await fetchTapBandAccessDecision({
      environment: url.searchParams.get("environment"),
      orgId: url.searchParams.get("orgId") ?? url.searchParams.get("org_id"),
      eventId: url.searchParams.get("eventId") ?? url.searchParams.get("event_id"),
      capability,
      channel: url.searchParams.get("channel"),
      supplierBatch: url.searchParams.get("supplierBatch") ?? url.searchParams.get("supplier_batch"),
      chipFamily: url.searchParams.get("chipFamily") ?? url.searchParams.get("chip_family"),
      keyVersion: url.searchParams.get("keyVersion") ?? url.searchParams.get("key_version"),
      outletId: url.searchParams.get("outletId") ?? url.searchParams.get("outlet_id"),
      deviceId: url.searchParams.get("deviceId") ?? url.searchParams.get("device_id"),
      entryZone: url.searchParams.get("entryZone") ?? url.searchParams.get("entry_zone"),
    })

    return NextResponse.json({ ok: true, ...safeTapBandConfigPayload(decision) })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve TapBand configuration"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

function parseCapability(value: string | null): TapBandCapability | null {
  if (!value) return null
  return TAPBAND_CAPABILITIES.includes(value as TapBandCapability) ? (value as TapBandCapability) : null
}
