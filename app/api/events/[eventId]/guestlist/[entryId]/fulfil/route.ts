import { NextResponse, type NextRequest } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ eventId: string; entryId: string }> }

// Maps fn_issue_guestlist error codes to buyer-facing copy.
const ERROR_COPY: Record<string, string> = {
  guestlist_entry_not_found: "Guestlist entry not found.",
  event_not_found: "Event not found.",
  not_authorized: "You don't have permission to fulfil this guestlist.",
  no_ticket_type: "Select a ticket type on this guest before fulfilling.",
  ticket_type_not_found: "That ticket type does not belong to this event.",
  already_fulfilled: "This guestlist entry has already been fully fulfilled.",
  invalid_quantity: "Nothing left to fulfil for this guest.",
  no_buyer: "Couldn't determine who should hold this complimentary ticket.",
}

function describe(message: string): string {
  for (const [code, copy] of Object.entries(ERROR_COPY)) {
    if (message.includes(code)) return copy
  }
  return "Unable to fulfil guestlist entry"
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { entryId } = await context.params

  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const requestedQuantity = Number(body.quantity)
  const allocate = Number.isFinite(requestedQuantity) && requestedQuantity > 0 ? Math.floor(requestedQuantity) : null

  // fn_issue_guestlist is the approved backend function: it authorizes the
  // caller, enforces the remaining allocation, issues coded order_items and
  // writes the audit row in one transaction. Called with the user-scoped
  // client so auth.uid() flows through to the function's authorization check.
  const { data, error } = await supabase.rpc("fn_issue_guestlist", {
    p_guestlist_entry_id: entryId,
    p_allocate: allocate,
  })

  if (error) {
    console.error("fn_issue_guestlist failed", error)
    const message = error.message ?? ""
    const status = message.includes("not_authorized") ? 403 : message.includes("already_fulfilled") ? 409 : 400
    return NextResponse.json({ error: describe(message) }, { status })
  }

  const result = (data ?? {}) as {
    order_id?: string
    quantity?: number
    fulfilled_count?: number
    remaining_count?: number
  }

  return NextResponse.json(
    {
      order_id: result.order_id,
      tickets: Array.from({ length: result.quantity ?? 0 }),
      fulfilled_count: result.fulfilled_count,
      remaining_count: result.remaining_count,
    },
    { status: 201 },
  )
}
