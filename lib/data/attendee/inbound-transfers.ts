// Source: v_inbound_transfers (security_invoker view — RLS to current user).
// Returns the next pending offer for the "Salman sent you a ticket" card.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface InboundTransferRow {
  transfer_id: string
  order_item_id: string
  from_user_id: string
  from_name: string
  from_handle: string | null
  ticket_code: string | null
  ticket_type_name: string | null
  price_cents: number | null
  currency: string | null
  event_id: string
  event_title: string
  event_starts_at: string | null
  cover_image_url: string | null
  venue_name: string | null
  offered_at: string
  expires_at: string
}

export async function getInboundTransfers(): Promise<InboundTransferRow[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("v_inbound_transfers")
    .select("*")
    .order("expires_at", { ascending: true })
    .limit(5)

  if (error) {
    console.error("[transfers] v_inbound_transfers failed", error)
    return []
  }
  return (data ?? []) as InboundTransferRow[]
}
