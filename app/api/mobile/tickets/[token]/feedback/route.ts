import { NextResponse } from "next/server"

import { resolveTicketHolder, submitTicketFeedback, TicketMemoryError } from "@/lib/mobile/ticket-memory"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** POST /api/mobile/tickets/[token]/feedback { rating, comment? } — private rating from the app. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rl = await rateLimit("mobile:ticket-feedback", clientKey(request), 10, 60)
  if (!rl.allowed) return tooManyRequests(rl)
  try {
    const { token } = await params
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
    const { admin, holder } = await resolveTicketHolder(token)
    await submitTicketFeedback(admin, holder, body.rating, body.comment)
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    if (error instanceof TicketMemoryError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error("[mobile-feedback]", error)
    return NextResponse.json({ error: "unavailable" }, { status: 503 })
  }
}
