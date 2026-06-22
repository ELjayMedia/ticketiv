// Source: v_my_tickets (RLS-scoped to the current buyer via buyer_id).
// For mutations (transfers, etc.) go through /api/tickets/* server routes so
// ownership + status are validated server-side.

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { MyTicketsViewSchema, validateSchema, type MyTicketsView } from "@/lib/schemas/views"

export async function getMyTickets(): Promise<MyTicketsView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("v_my_tickets")
    .select("*")
    .order("event_starts_at", { ascending: true, nullsFirst: false })

  if (error) {
    console.error("[tickets] v_my_tickets list:", error)
    return []
  }

  return (data ?? []).map((row) => validateSchema(MyTicketsViewSchema, row, "v_my_tickets")).filter(Boolean)
}

export async function getTicketById(orderItemId: string): Promise<MyTicketsView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("v_my_tickets")
    .select("*")
    .eq("order_item_id", orderItemId)
    .maybeSingle()

  if (error) {
    console.error("[tickets] v_my_tickets detail:", error)
    return null
  }
  if (!data) return null

  return validateSchema(MyTicketsViewSchema, data, "v_my_tickets")
}

export async function getTicketEventPolicy(eventId: string): Promise<unknown> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null
  const { data } = await supabase
    .from("events")
    .select("refund_policy")
    .eq("id", eventId)
    .maybeSingle()
  return data?.refund_policy ?? null
}

export async function createTransfer(input: { orderItemId: string; toUserId?: string; toEmail?: string }) {
  const res = await fetch("/api/tickets/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function acceptTransfer(transferId: string) {
  const res = await fetch(`/api/tickets/transfer/${transferId}/accept`, { method: "POST" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listTransfers(params?: { status?: "pending" | "accepted" | "declined" | "cancelled" | "completed" | "requested" }) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  let query = supabase.from("transfers").select(`
      *,
      order_item:order_items(
        id, ticket_code,
        orders:order_id(
          events:event_id( title )
        )
      )
    `)

  if (params?.status) query = query.eq("status", params.status)

  const { data, error } = await query.order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}
