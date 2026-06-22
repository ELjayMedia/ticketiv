import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// TICK-233: Finance CSV export for an organizer.
// GET /api/orgs/[orgId]/finance/export?from=YYYY-MM-DD&to=YYYY-MM-DD

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params
  const { searchParams } = request.nextUrl
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify org membership
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Fetch ledger entries (use correct column names from the schema)
  let query = supabase
    .from("ledger_entries")
    .select("id, type, amount_cents, currency, order_id, event_id, payment_id, occurred_at")
    .eq("org_id", orgId)
    .order("occurred_at", { ascending: false })

  if (from) query = query.gte("occurred_at", from)
  if (to) query = query.lte("occurred_at", to + "T23:59:59Z")

  const { data: entries, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Build CSV
  const rows = entries ?? []
  const headers = ["Date", "Type", "Amount (SZL)", "Currency", "Order ID", "Event ID", "Payment ID"]
  const csvRows = [
    headers.join(","),
    ...rows.map((row) => {
      const date = new Date(row.occurred_at).toLocaleDateString("en-SZ")
      const type = row.type ?? ""
      const amount = ((row.amount_cents ?? 0) / 100).toFixed(2)
      const currency = row.currency ?? "SZL"
      const orderId = row.order_id ?? ""
      const eventId = row.event_id ?? ""
      const paymentId = row.payment_id ?? ""
      return [date, type, amount, currency, orderId, eventId, paymentId].join(",")
    }),
  ]

  const csv = csvRows.join("\n")
  const filename = `ticketiv-finance-${orgId.slice(0, 8)}${from ? `-${from}` : ""}${to ? `-to-${to}` : ""}.csv`

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
