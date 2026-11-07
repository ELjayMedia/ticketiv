import { NextResponse } from "next/server"

/**
 * Retired: the legacy route accepted arbitrary recipients and messages, then
 * delegated to a service-role realtime broadcaster without authorizing the
 * caller. Supported notifications are dispatched by internal workflows.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Notification endpoint retired" },
    { status: 410 },
  )
}
