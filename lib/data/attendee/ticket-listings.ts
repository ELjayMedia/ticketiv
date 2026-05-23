import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AttendeeTicketListing {
  id: string
  orderItemId: string | null
  sellerId: string | null
  orgId: string | null
  priceCents: number
  currency: string
  status: string
  listingExpiresAt: string | null
  transferFeeCents: number | null
  transferId: string | null
  createdAt: string | null
}

type TicketListingRow = {
  id: string
  order_item_id: string | null
  seller_id: string | null
  org_id: string | null
  price_cents: number | null
  currency: string | null
  status: string | null
  listing_expires_at: string | null
  transfer_fee_cents: number | null
  transfer_id: string | null
  created_at: string | null
}

function mapRow(row: TicketListingRow): AttendeeTicketListing {
  return {
    id: row.id,
    orderItemId: row.order_item_id,
    sellerId: row.seller_id,
    orgId: row.org_id,
    priceCents: row.price_cents ?? 0,
    currency: row.currency ?? "SZL",
    status: row.status ?? "active",
    listingExpiresAt: row.listing_expires_at,
    transferFeeCents: row.transfer_fee_cents,
    transferId: row.transfer_id,
    createdAt: row.created_at,
  }
}

export async function getMyTicketListings(): Promise<AttendeeTicketListing[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("resale_listings")
    .select("id, order_item_id, seller_id, org_id, price_cents, currency, status, listing_expires_at, transfer_fee_cents, transfer_id, created_at")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[ticket-listings] list:", error)
    return []
  }

  return ((data ?? []) as TicketListingRow[]).map(mapRow)
}
