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

export interface PublicEventTicketListing extends AttendeeTicketListing {
  eventTitle: string | null
  eventSlug: string | null
  ticketTypeName: string | null
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

type PublicTicketListingRow = TicketListingRow & {
  order_items?: {
    ticket_type_id: string | null
    ticket_types?: { name: string | null } | null
    orders?: { event_id: string | null; events?: { title: string | null; slug: string | null } | null } | null
  } | null
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

function mapPublicRow(row: PublicTicketListingRow): PublicEventTicketListing {
  return {
    ...mapRow(row),
    eventTitle: row.order_items?.orders?.events?.title ?? null,
    eventSlug: row.order_items?.orders?.events?.slug ?? null,
    ticketTypeName: row.order_items?.ticket_types?.name ?? null,
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

export async function getPublicEventTicketListings(eventId: string | null): Promise<PublicEventTicketListing[]> {
  if (!eventId) return []

  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("resale_listings")
    .select(`
      id,
      order_item_id,
      seller_id,
      org_id,
      price_cents,
      currency,
      status,
      listing_expires_at,
      transfer_fee_cents,
      transfer_id,
      created_at,
      order_items:order_item_id(
        ticket_type_id,
        ticket_types:ticket_type_id(name),
        orders:order_id(
          event_id,
          events:event_id(title, slug)
        )
      )
    `)
    .eq("status", "active")
    .eq("order_items.orders.event_id", eventId)
    .order("price_cents", { ascending: true })
    .limit(20)

  if (error) {
    console.error("[ticket-listings] public event list:", error)
    return []
  }

  return ((data ?? []) as PublicTicketListingRow[]).map(mapPublicRow)
}
