import { NextResponse, type NextRequest } from "next/server"

import { getAuthenticatedUserId, loadEventManageContext } from "@/lib/api/event-management"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ eventId: string }> }

type TicketTypeRow = {
  id: string
  event_id: string
  name: string
  price_cents: number
  currency: string
  quota: number
  per_user_limit: number | null
  is_reserved_seating: boolean | null
  sales_status: "on_sale" | "paused" | "sold_out" | "hidden"
  sales_paused_at: string | null
  sales_pause_reason: string | null
  created_at: string | null
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { eventId } = await context.params
  const userId = await getAuthenticatedUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { allowed, event } = await loadEventManageContext(admin, eventId, userId, "id, org_id")
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 })
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  const { data: ticketTypes, error } = await admin
    .from("ticket_types")
    .select("id, event_id, name, price_cents, currency, quota, per_user_limit, is_reserved_seating, sales_status, sales_paused_at, sales_pause_reason, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const rows = (ticketTypes ?? []) as TicketTypeRow[]

  const [counts, remainingResult] = await Promise.all([
    Promise.all(
      rows.map(async (ticketType) => {
        const { count } = await admin
          .from("order_items")
          .select("id", { count: "exact", head: true })
          .eq("ticket_type_id", ticketType.id)
          .in("status", ["pending", "issued", "checked_in"])

        return [ticketType.id, count ?? 0] as const
      }),
    ),
    rows.length > 0
      ? (admin.rpc as any)("fn_ticket_type_remaining", { p_event_id: eventId }) as Promise<{
          data: Array<{ ticket_type_id: string; remaining: number }> | null
          error: any
        }>
      : Promise.resolve({ data: [], error: null }),
  ])

  const reservedByTicketType = Object.fromEntries(counts)
  const remainingMap = new Map<string, number>(
    ((remainingResult.data ?? []) as Array<{ ticket_type_id: string; remaining: number }>).map(
      (r) => [r.ticket_type_id, r.remaining],
    ),
  )

  const tickets = rows.map((ticketType) => {
    const reserved = reservedByTicketType[ticketType.id] ?? 0
    const quota = ticketType.quota ?? 0
    const available = Math.max(quota - reserved, 0)
    const remainingConfirmed = remainingMap.has(ticketType.id)
      ? (remainingMap.get(ticketType.id) as number)
      : quota
    const soldConfirmed = Math.max(0, quota - remainingConfirmed)

    return {
      ...ticketType,
      reserved_count: reserved,
      available_count: available,
      sold_out: quota > 0 && available <= 0,
      sold_confirmed: soldConfirmed,
      remaining_confirmed: remainingConfirmed,
    }
  })

  return NextResponse.json({ tickets })
}
