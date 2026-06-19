import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function getScannableEvents() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("event_staff")
    .select(`
      role, active,
      events:event_id ( id, title, starts_at, venues:venue_id(name) )
    `)
    .eq("user_id", user.id)
    .eq("active", true)

  if (error) throw error

  return (data ?? []).map((item: any) => ({
    id: item.events.id,
    title: item.events.title,
    starts_at: item.events.starts_at,
    venue_name: item.events.venues?.name,
  }))
}

export async function startDeviceSession(params: { deviceId: string; eventId: string }) {
  const res = await fetch("/api/scanner/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function validateTicketScan(input: {
  event_id: string
  ticket_code: string
  device_id?: string
  gate?: string
  notes?: string
}) {
  // Always server-authoritative for atomicity (insert scans + update order_items.checked_in_at)
  const res = await fetch("/api/scanner/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getScanHistory(params: { eventId: string; limit?: number }) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("scans")
    .select(`
      *,
      order_item:order_items(
        ticket_code,
        ticket_type:ticket_types(name)
      )
    `)
    .eq("event_id", params.eventId)
    .order("scanned_at", { ascending: false })
    .limit(params.limit || 50)

  if (error) throw error
  return data ?? []
}

export async function syncOfflineScans(payload: {
  sessionId: string
  scans: Array<{ event_id: string; ticket_code: string; scanned_at: string; gate?: string }>
}) {
  const res = await fetch("/api/scanner/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
