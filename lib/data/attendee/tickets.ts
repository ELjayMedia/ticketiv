// Tables: order_items, orders, ticket_types, events, event_dates, venues, transfers
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { getDemoUserTickets, getDemoTicketDetail } from "@/lib/demo-data"

export async function getMyTickets() {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return getDemoUserTickets(demoSession.id)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id, ticket_code, checked_in_at, holder_name, holder_email, holder_phone, seat_id, revoked_at,
      orders:order_id (
        id, status, currency, event_id,
        events:event_id (
          id, title,
          venues:venue_id ( name, city ),
          event_dates ( starts_at )
        )
      ),
      ticket_types:ticket_type_id ( name, price_cents, currency )
    `)
    .is("revoked_at", null)
    .order("id", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getTicketById(orderItemId: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return getDemoTicketDetail(orderItemId)
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("order_items")
    .select(`
      id, ticket_code, checked_in_at, holder_name, holder_email, holder_phone, seat_id, revoked_at,
      orders:order_id (
        id, status, currency, event_id,
        events:event_id (
          id, title, description,
          venues:venue_id ( name, address, city, tz ),
          event_dates ( starts_at, ends_at )
        )
      ),
      ticket_types:ticket_type_id ( name, price_cents, currency )
    `)
    .eq("id", orderItemId)
    .single()

  if (error) throw error
  return data
}

export async function createTransfer(input: { orderItemId: string; toUserId?: string; toEmail?: string }) {
  // Transfer should be server-mediated to validate ownership + status
  const res = await fetch("/api/tickets/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function acceptTransfer(transferId: string) {
  const res = await fetch(`/api/tickets/transfer/${transferId}/accept`, {
    method: "POST",
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function listTransfers(params?: { status?: "pending" | "accepted" | "revoked" }) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return []
  }

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

  if (params?.status) {
    query = query.eq("status", params.status)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}
