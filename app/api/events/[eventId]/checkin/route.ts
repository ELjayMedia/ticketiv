import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { POST as scanTicket } from "../scan/route"

/**
 * POST /api/events/[eventId]/checkin  (legacy)
 *
 * Body: { qr_token: string }
 *
 * Kept for older clients. It used to read the ticket and then update
 * order_items.checked_in_at directly, which let two simultaneous scans both
 * admit the same ticket, admitted refunded or voided tickets, and left no scan
 * record. It now forwards to POST /api/events/[eventId]/scan, so admission goes
 * through the one atomic scan RPC: verified staff identity, event-staff check,
 * ticket status, single-use lock and the scan audit row.
 */

const CheckinRequestSchema = z.object({
  qr_token: z.string().trim().min(1, "QR token required").max(512),
})

export async function POST(request: NextRequest, context: { params: Promise<{ eventId: string }> }) {
  const parsed = CheckinRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.issues }, { status: 400 })
  }

  // Same cookies and auth headers, new body (so its old length no longer applies).
  const headers = new Headers(request.headers)
  headers.delete("content-length")
  headers.set("content-type", "application/json")
  const forwarded = new NextRequest(request.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ticket_code: parsed.data.qr_token }),
  })
  return scanTicket(forwarded, context)
}
