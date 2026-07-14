import { NextResponse } from "next/server"

import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"
import { recordTapBandTelemetryEvent } from "@/lib/tapband/telemetry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const expectedSecret = process.env.TAPBAND_TELEMETRY_SECRET
  const authHeader = request.headers.get("authorization")
  const keyHeader = request.headers.get("x-tapband-telemetry-secret")

  if (!expectedSecret || (authHeader !== `Bearer ${expectedSecret}` && keyHeader !== expectedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rl = await rateLimit("tapband:telemetry", clientKey(request), 300, 60)
  if (!rl.allowed) return tooManyRequests(rl)

  const body = await request.json().catch(() => ({}))

  try {
    const event = await recordTapBandTelemetryEvent({
      eventType: String(body.eventType ?? body.event_type ?? ""),
      severity: body.severity,
      orgId: body.orgId ?? body.org_id ?? null,
      eventId: body.eventId ?? body.event_id ?? null,
      deviceId: body.deviceId ?? body.device_id ?? null,
      outcome: body.outcome ?? null,
      channel: body.channel ?? null,
      credentialId: body.credentialId ?? body.credential_id ?? null,
      credentialHash: body.credentialHash ?? body.credential_hash ?? null,
      serial: body.serial ?? null,
      serialHash: body.serialHash ?? body.serial_hash ?? null,
      actorId: body.actorId ?? body.actor_id ?? null,
      actorHash: body.actorHash ?? body.actor_hash ?? null,
      readerId: body.readerId ?? body.reader_id ?? null,
      correlationId: body.correlationId ?? body.correlation_id ?? null,
      latencyMs: body.latencyMs ?? body.latency_ms ?? null,
      metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata : null,
      occurredAt: body.occurredAt ?? body.occurred_at ?? null,
    })

    return NextResponse.json({ ok: true, id: event.id }, { status: 202 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record TapBand telemetry"
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }
}
