import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// TICK-49 — Attendee roster CSV export (server-side, RLS-scoped)

function csvCell(v: unknown) {
  if (v === null || v === undefined) return ""
  const s = typeof v === "object" ? JSON.stringify(v) : String(v)
  return `"${s.replaceAll('"', '""')}"`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { orgId: string; eventId: string } },
) {
  const { orgId, eventId } = params

  const supabase = createServerSupabaseClient()
  if (!supabase) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify org membership
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Verify event belongs to org
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("id", eventId)
    .eq("org_id", orgId)
    .maybeSingle()
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: items = [] } = await supabase
    .from("order_items")
    .select(`
      ticket_code, status, holder_name, holder_email, holder_phone,
      checked_in_at, revoked_at, refunded_at, created_at,
      ticket_types!inner(name, price_cents, currency, event_id),
      orders!inner(id, status, email, buyer_email, channel, total_cents, org_id)
    `)
    .eq("ticket_types.event_id", eventId)
    .eq("orders.org_id", orgId)
    .order("created_at", { ascending: false })

  const columns = [
    "ticket_code",
    "status",
    "holder_name",
    "holder_email",
    "holder_phone",
    "checked_in_at",
    "ticket_type",
    "price_cents",
    "price_szl",
    "order_id",
    "order_status",
    "buyer_email",
    "channel",
    "created_at",
  ]

  const rows = (items ?? []).map((item: any) => ({
    ticket_code: item.ticket_code,
    status: item.status,
    holder_name: item.holder_name ?? "",
    holder_email: item.holder_email ?? item.orders?.buyer_email ?? "",
    holder_phone: item.holder_phone ?? "",
    checked_in_at: item.checked_in_at ?? "",
    ticket_type: item.ticket_types?.name ?? "",
    price_cents: item.ticket_types?.price_cents ?? 0,
    price_szl: ((item.ticket_types?.price_cents ?? 0) / 100).toFixed(2),
    order_id: item.orders?.id ?? "",
    order_status: item.orders?.status ?? "",
    buyer_email: item.orders?.buyer_email ?? item.orders?.email ?? "",
    channel: item.orders?.channel ?? "",
    created_at: item.created_at ?? "",
  }))

  const csv = [
    columns.join(","),
    ...rows.map((row) => columns.map((col) => csvCell((row as any)[col])).join(",")),
  ].join("\n")

  const slug = event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)
  const date = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="attendees-${slug}-${date}.csv"`,
    },
  })
}
