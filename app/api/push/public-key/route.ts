import { NextResponse } from "next/server"

import { getVapidKeys } from "@/lib/push/server"

export const dynamic = "force-dynamic"

/**
 * The VAPID public key browsers subscribe with. Public by design (it is the
 * applicationServerKey); served at run time so a key saved in the admin
 * console works without rebuilding the app. 404 when push is off.
 */
export async function GET() {
  const keys = await getVapidKeys()
  if (!keys) return NextResponse.json({ publicKey: null }, { status: 404, headers: { "Cache-Control": "no-store" } })
  return NextResponse.json({ publicKey: keys.publicKey }, { headers: { "Cache-Control": "public, max-age=60" } })
}
