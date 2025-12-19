// Tables: events, orders, ledger_entries, scans, payouts, payout_accounts, event_staff, devices
import { createServerSupabaseClient } from "@/lib/supabase"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_EVENTS, DEMO_ORDERS, DEMO_ORDER_ITEMS } from "@/lib/demo-data"

export async function getOrganizerDashboardKpis(params?: { range?: "7d" | "30d" | "90d" | "all" }) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const orders = DEMO_ORDERS.filter((o) => o.status === "completed")
    const items = DEMO_ORDER_ITEMS.filter((i) => orders.some((o) => o.id === i.order_id))

    return {
      events_count: DEMO_EVENTS.length,
      tickets_sold: items.length,
      gross_revenue_cents: orders.reduce((sum, o) => sum + o.total_amount, 0),
      net_revenue_cents: orders.reduce((sum, o) => sum + o.total_amount - o.fee_amount, 0),
      check_ins: items.filter((i) => i.checked_in_at).length,
      currency: "USD",
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { data, error } = await supabase.rpc("get_organizer_kpis", {
    p_range: params?.range || "30d",
  })

  if (error) throw error
  return data || {}
}

export async function getOrganizerEvents() {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return DEMO_EVENTS.map((e) => ({
      ...e,
      orders_count: DEMO_ORDERS.filter((o) => o.event_id === e.id).length,
      tickets_sold: DEMO_ORDER_ITEMS.filter((i) => DEMO_ORDERS.some((o) => o.id === i.order_id && o.event_id === e.id))
        .length,
    }))
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      orders(count),
      order_items(count)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getEventKpis(eventId: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const orders = DEMO_ORDERS.filter((o) => o.event_id === eventId && o.status === "completed")
    const items = DEMO_ORDER_ITEMS.filter((i) => orders.some((o) => o.id === i.order_id))

    return {
      orders_count: orders.length,
      tickets_sold: items.length,
      gross_revenue_cents: orders.reduce((sum, o) => sum + o.total_amount, 0),
      check_ins: items.filter((i) => i.checked_in_at).length,
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { data, error } = await supabase.rpc("get_event_kpis", {
    p_event_id: eventId,
  })

  if (error) throw error
  return data || {}
}

export async function getEventLedger(eventId: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("ledger_entries")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getPayouts(orgId?: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  let query = supabase
    .from("payouts")
    .select(`
      *,
      payout_account:payout_accounts(*)
    `)
    .order("created_at", { ascending: false })

  if (orgId) {
    query = query.eq("org_id", orgId)
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}

export async function requestPayout(input: { orgId: string; eventId?: string; amountCents: number }) {
  // Payout requests should be server-mediated
  const res = await fetch("/api/payouts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getEventStaff(eventId: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("event_staff")
    .select(`
      *,
      user:profiles(email, first_name, last_name)
    `)
    .eq("event_id", eventId)

  if (error) throw error
  return data ?? []
}

export async function getDevices(eventId?: string) {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  let query = supabase
    .from("devices")
    .select(`
      *,
      device_sessions(count, scans(count))
    `)
    .order("last_seen_at", { ascending: false })

  if (eventId) {
    query = query.eq("event_id", eventId)
  }

  const { data, error } = await query

  if (error) throw error
  return data ?? []
}
