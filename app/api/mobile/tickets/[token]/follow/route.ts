import { NextResponse } from "next/server"

import { resolveTicketHolder, setTicketOrgFollow, TicketMemoryError } from "@/lib/mobile/ticket-memory"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/mobile/tickets/[token]/follow { follow } — "Hear about their next event" from the app. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rl = await rateLimit("mobile:ticket-follow", clientKey(request), 20, 60)
  if (!rl.allowed) return tooManyRequests(rl)
  try {
    const { token } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const { admin, holder } = await resolveTicketHolder(token)
    const following = await setTicketOrgFollow(admin, holder, body.follow)
    return NextResponse.json({ ok: true, following }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof TicketMemoryError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[mobile-follow]", error)
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}
