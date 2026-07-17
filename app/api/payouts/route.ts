import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

const ERROR_COPY: Record<string, string> = {
  org_id_required: "Organization is required.",
  not_authorized: "You don't have permission to request a payout for this organization.",
  invalid_amount: "Enter a payout amount greater than zero.",
  no_payout_account: "Add a payout account before requesting a payout.",
  payout_in_progress: "You already have a payout in progress. Wait for it to settle first.",
  funds_pending_settlement: "Those funds are captured but not settled yet. Try again after the settlement window.",
  insufficient_balance: "That amount is more than your settled payable balance.",
}

function describe(message: string): string {
  for (const [code, copy] of Object.entries(ERROR_COPY)) {
    if (message.includes(code)) return copy
  }
  return "Unable to request payout"
}

export async function POST(request: Request) {
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
  const orgId = typeof body.orgId === "string" ? body.orgId : ""
  const amountCents = Math.floor(Number(body.amountCents ?? 0))

  if (!orgId) {
    return NextResponse.json({ error: "Organization is required" }, { status: 400 })
  }

  const { data, error } = await supabase.rpc("fn_request_payout", {
    p_org_id: orgId,
    p_amount_cents: amountCents,
  })

  if (error) {
    console.error("fn_request_payout failed", error)
    return NextResponse.json({ error: describe(error.message ?? "") }, { status: 400 })
  }

  return NextResponse.json(data, { status: 201 })
}
