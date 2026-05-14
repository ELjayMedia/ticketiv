import { NextResponse, type NextRequest } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

type RouteContext = { params: Promise<{ orderId: string }> }

async function getUserId() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.user?.id ?? null
}

async function canViewOrder(admin: ReturnType<typeof createAdminClient>, order: any, userId: string) {
  if (order.buyer_id === userId) return true

  const { data: globalAdmin } = await admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle()
  if (globalAdmin) return true

  const { data: member } = await admin.from("org_members").select("role").eq("org_id", order.org_id).eq("user_id", userId).maybeSingle()
  return Boolean(member)
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { orderId } = await context.params
  const userId = await getUserId()
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from("orders")
    .select(`
      id,
      org_id,
      buyer_id,
      status,
      total_cents,
      currency,
      buyer_email,
      buyer_phone,
      email,
      phone,
      created_at,
      order_items(
        id,
        ticket_code,
        status,
        holder_name,
        holder_email,
        holder_phone,
        ticket_types(
          id,
          name,
          price_cents,
          currency,
          events(
            id,
            title,
            starts_at,
            ends_at,
            city,
            venues(name, city, address)
          )
        )
      )
    `)
    .eq("id", orderId)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const allowed = await canViewOrder(admin, order, userId)
  if (!allowed) return NextResponse.json({ error: "Permission denied" }, { status: 403 })

  return NextResponse.json({ order })
}
