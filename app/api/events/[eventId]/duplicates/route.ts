import { NextResponse, type NextRequest } from "next/server"

import { DUPLICATE_REASONS, type DuplicateMatch } from "@/lib/events/duplicates-core"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string }> }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function rpcError(error: { message?: string; code?: string }) {
  const message = error.message ?? ""
  if (error.code === "42501" || message.includes("not_allowed")) return NextResponse.json({ error: "You can't do that for this event." }, { status: 403 })
  if (message.includes("not_a_match")) return NextResponse.json({ error: "That event no longer matches yours. Refresh the page." }, { status: 409 })
  if (message.includes("message_too_short")) return NextResponse.json({ error: "Tell support a little more (at least 10 characters)." }, { status: 400 })
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 })
}

/** Other organisers' published events this event matches, with any request status. */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  if (!UUID_RE.test(eventId)) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 })

  const { data, error } = await (supabase.rpc as any)("fn_event_duplicate_check", { p_event_id: eventId })
  if (error) return rpcError(error)
  return NextResponse.json({ matches: (data ?? []) as DuplicateMatch[] })
}

/** Ask support for permission (or explain) about one match. */
export async function POST(request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const body = await request.json().catch(() => ({}))
  const originalEventId = typeof body.originalEventId === "string" ? body.originalEventId : ""
  const reason = typeof body.reason === "string" ? body.reason : ""
  const message = typeof body.message === "string" ? body.message.trim() : ""

  if (!UUID_RE.test(eventId) || !UUID_RE.test(originalEventId)) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!DUPLICATE_REASONS.some((r) => r.value === reason)) return NextResponse.json({ error: "Choose what best describes the situation." }, { status: 400 })
  if (message.length < 10 || message.length > 2000) return NextResponse.json({ error: "Write between 10 and 2,000 characters." }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 })
  const { data, error } = await (supabase.rpc as any)("fn_request_duplicate_permission", {
    p_event_id: eventId,
    p_original_event_id: originalEventId,
    p_reason: reason,
    p_message: message,
  })
  if (error) return rpcError(error)
  return NextResponse.json({ requestId: data }, { status: 201 })
}

/** Withdraw an open request. */
export async function DELETE(request: NextRequest) {
  const requestId = new URL(request.url).searchParams.get("requestId") ?? ""
  if (!UUID_RE.test(requestId)) return NextResponse.json({ error: "Request not found" }, { status: 404 })
  const supabase = await createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Unavailable" }, { status: 503 })
  const { error } = await (supabase.rpc as any)("fn_withdraw_duplicate_request", { p_request_id: requestId })
  if (error) return rpcError(error)
  return NextResponse.json({ ok: true })
}
