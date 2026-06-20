// Source: events + ticket_types + ticket_type_channels (filtered to channel='pos').
// Used by the box-office POS to show what's sellable at the door.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface POSTicketType {
  id: string
  name: string
  priceCents: number
  currency: string
  posQuotaRemaining: number | null
  isSoldOut: boolean
  isPaused: boolean
}

export interface POSEventContext {
  eventId: string
  eventTitle: string
  orgId: string
  deviceLabel: string
  currency: string
  ticketTypes: POSTicketType[]
}

export async function getPOSContext(
  orgId: string,
  eventId: string,
  deviceId?: string,
): Promise<POSEventContext | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const [eventRes, typesRes, channelsRes, soldRes, deviceRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, org_id")
      .eq("id", eventId)
      .eq("org_id", orgId)
      .maybeSingle(),
    supabase
      .from("ticket_types")
      .select("id, name, price_cents, currency, quota, sales_status, sales_paused_at")
      .eq("event_id", eventId)
      .order("price_cents", { ascending: true }),
    supabase
      .from("ticket_type_channels")
      .select("ticket_type_id, channel, quota")
      .eq("channel", "pos"),
    supabase
      .from("order_items")
      .select("ticket_type_id, orders!inner(channel, status)")
      .in("status", ["issued", "checked_in"])
      .eq("orders.channel", "pos"),
    deviceId
      ? supabase.from("devices").select("label").eq("id", deviceId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!eventRes.data) return null

  // Count POS sales per ticket type so we can subtract from quota.
  const soldByType = new Map<string, number>()
  for (const row of soldRes.data ?? []) {
    if (!row.ticket_type_id) continue
    soldByType.set(row.ticket_type_id, (soldByType.get(row.ticket_type_id) ?? 0) + 1)
  }

  const posQuotaByType = new Map<string, number>()
  for (const ch of channelsRes.data ?? []) {
    if (!ch.ticket_type_id) continue
    posQuotaByType.set(ch.ticket_type_id, ch.quota ?? 0)
  }

  const ticketTypes: POSTicketType[] = (typesRes.data ?? []).map((t) => {
    const posQuota = posQuotaByType.get(t.id) ?? t.quota
    const sold = soldByType.get(t.id) ?? 0
    const remaining = posQuota === null ? null : Math.max(0, posQuota - sold)
    const isPaused = t.sales_status === "paused"
    const isSoldOut = t.sales_status === "sold_out" || remaining === 0
    return {
      id: t.id,
      name: t.name,
      priceCents: t.price_cents ?? 0,
      currency: t.currency ?? "SZL",
      posQuotaRemaining: remaining,
      isSoldOut,
      isPaused,
    }
  })

  const currency = ticketTypes[0]?.currency ?? "SZL"

  return {
    eventId: eventRes.data.id,
    eventTitle: eventRes.data.title,
    orgId,
    deviceLabel: deviceRes.data?.label ?? "Counter",
    currency,
    ticketTypes,
  }
}
