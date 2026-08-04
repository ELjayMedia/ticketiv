import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

type RpcResult = {
  outcome: string
  valid: boolean
  message: string
  scan_id?: string | null
  order_item_id?: string | null
  ticket_type_name?: string | null
  checked_in_at?: string | null
  idempotent?: boolean
}

// Map fn_scan_ticket canonical outcomes → legacy API names the scanner UI expects.
function mapOutcome(rpcOutcome: string): string {
  switch (rpcOutcome) {
    case "validated": return "valid"
    case "duplicate": return "already_used"
    case "not_found": return "unknown_ticket"
    case "not_paid":  return "not_issued"
    default:          return rpcOutcome
  }
}

function outcomeToStatus(rpcOutcome: string): number {
  switch (rpcOutcome) {
    case "validated":    return 200
    case "duplicate":    return 409
    case "unauthorized": return 403
    case "not_found":    return 404
    case "wrong_event":
    case "revoked":
    case "refunded":
    case "not_paid":     return 409
    default:             return 400
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params

  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })

  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const ticketCode = typeof body.ticket_code === "string" ? body.ticket_code.trim() : ""
  const gate       = typeof body.gate       === "string" ? body.gate.trim() || null : null
  const deviceId   = typeof body.device_id  === "string" ? body.device_id  : null
  const sessionId  = typeof body.session_id === "string" ? body.session_id : null
  const scannedAt  = typeof body.scanned_at === "string" ? body.scanned_at : new Date().toISOString()
  const attemptId  = typeof body.attempt_id === "string" ? body.attempt_id : null

  if (!ticketCode) return NextResponse.json({ error: "Ticket code is required" }, { status: 400 })

  const admin = createAdminClient()
  // fn_scan_ticket is the *claimed-account* shim: it runs
  // app.require_claimed_account(), which needs auth.uid() from a user JWT. This
  // client is service-role and has no auth.uid(), so calling the shim raises
  // `claimed_account_required` and every scan 500s. Call the worker instead —
  // it keeps the real authorization (service_role is allowed through its caller
  // guard, and it still verifies p_scanned_by is event staff), and this route
  // has already required an authenticated session above and passes that user as
  // p_scanned_by.
  const { data, error } = await (admin.rpc as any)("fn_scan_ticket_unchecked", {
    p_ticket_code: ticketCode,
    p_event_id:    eventId,
    p_scanned_by:  userId,
    p_device_id:   deviceId,
    p_session_id:  sessionId,
    p_gate:        gate,
    p_scanned_at:  scannedAt,
    p_attempt_id:  attemptId,
  })

  if (error) {
    console.error("fn_scan_ticket_unchecked error", error)
    return NextResponse.json({ error: "Scan failed" }, { status: 500 })
  }

  const result = data as RpcResult
  const uiOutcome = mapOutcome(result.outcome)
  const httpStatus = outcomeToStatus(result.outcome)

  const response: Record<string, unknown> = {
    outcome: uiOutcome,
    message: result.message,
    valid:   result.valid,
  }

  if (result.valid && result.order_item_id) {
    response.ticket = {
      id:           result.order_item_id,
      code:         ticketCode,
      type:         result.ticket_type_name ?? null,
      checked_in_at: result.checked_in_at ?? null,
    }
  }

  return NextResponse.json(response, { status: httpStatus })
}
