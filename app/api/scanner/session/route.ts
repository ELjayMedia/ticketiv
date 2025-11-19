import { NextResponse } from "next/server"

import { closeDeviceSession, startDeviceSession } from "@/lib/scanning"

export async function POST(request: Request) {
  const body = await request.json()
  try {
    if (!body.eventId) {
      return NextResponse.json({ error: "eventId is required" }, { status: 400 })
    }

    const session = await startDeviceSession(String(body.deviceId ?? "web"), String(body.eventId))
    return NextResponse.json(session, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to start session" }, { status: 400 })
  }
}

export async function PATCH(request: Request) {
  const body = await request.json()
  try {
    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 })
    }

    const session = await closeDeviceSession(String(body.sessionId))
    return NextResponse.json(session)
  } catch (error: any) {
    return NextResponse.json({ error: error.message ?? "Unable to close session" }, { status: 400 })
  }
}
