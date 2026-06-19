// Tables: events, orders, ledger_entries, scans, payouts, payout_accounts, event_staff, devices
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getOrganizerDashboardKpis(params?: { range?: "7d" | "30d" | "90d" | "all" }) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { data, error } = await supabase.rpc("get_organizer_kpis", {
    p_range: params?.range || "30d",
  })

  if (error) throw error
  return data || {}
}

export async function getOrganizerEvents() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("events")
    .select(`
      *,
      ticket_types(count)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getEventKpis(eventId: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { data, error } = await supabase.rpc("get_event_kpis", {
    p_event_id: eventId,
  })

  if (error) throw error
  return data || {}
}

export async function getEventLedger(eventId: string) {
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
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("event_staff")
    .select(`
      *,
      user:profiles(display_name, name, surname)
    `)
    .eq("event_id", eventId)

  if (error) throw error
  return data ?? []
}

export async function getDevices(eventId?: string) {
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
