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
  ticketTypeId: string | null
  ticketTypeName: string | null
  /** Number of completed resales by this seller (trust signal). */
  sellerCompletedCount: number
}

export type ResaleSort = "price_asc" | "price_desc" | "newest"

export interface ResaleTicketTypeOption {
  id: string
  name: string
}

export interface ResalePriceStats {
  /** Lowest active listing price, in cents. */
  minCents: number
  /** Highest active listing price, in cents. */
  maxCents: number
  /** Mean active listing price, in cents (rounded). */
  avgCents: number
  /** Number of active listings the stats were computed from. */
  count: number
  currency: string
}

export interface PublicEventListingsResult {
  listings: PublicEventTicketListing[]
  /** Distinct ticket types across all active listings for the event (pre-filter). */
  ticketTypes: ResaleTicketTypeOption[]
  /** Price stats over the full active listing pool (pre-filter), or null when empty. */
  priceStats: ResalePriceStats | null
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
    ticket_types?: { name: string | null; events?: { id: string; title: string | null; slug: string | null } | null } | null
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

function mapPublicRow(
  row: PublicTicketListingRow,
  sellerCountMap: Map<string, number> = new Map(),
): PublicEventTicketListing {
  return {
    ...mapRow(row),
    eventTitle: row.order_items?.ticket_types?.events?.title ?? null,
    eventSlug: row.order_items?.ticket_types?.events?.slug ?? null,
    ticketTypeId: row.order_items?.ticket_type_id ?? null,
    ticketTypeName: row.order_items?.ticket_types?.name ?? null,
    sellerCompletedCount: row.seller_id ? (sellerCountMap.get(row.seller_id) ?? 0) : 0,
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

const PUBLIC_LISTING_SELECT = `
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
    ticket_types:ticket_type_id(
      name,
      events:event_id(id, title, slug)
    )
  )
`

export async function getPublicEventTicketListings(
  eventId: string | null,
  opts: { sort?: ResaleSort; ticketTypeId?: string | null } = {},
): Promise<PublicEventListingsResult> {
  if (!eventId) return { listings: [], ticketTypes: [], priceStats: null }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { listings: [], ticketTypes: [], priceStats: null }

  const sort: ResaleSort = opts.sort ?? "price_asc"
  const orderColumn = sort === "newest" ? "created_at" : "price_cents"
  const ascending = sort === "price_asc"

  const { data, error } = await supabase
    .from("resale_listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("status", "active")
    .eq("order_items.ticket_types.events.id", eventId)
    .order(orderColumn, { ascending })
    .limit(20)

  if (error) {
    console.error("[ticket-listings] public event list:", error)
    return { listings: [], ticketTypes: [], priceStats: null }
  }

  const rows = (data ?? []) as PublicTicketListingRow[]

  // Fetch seller trust signals — completed-resale counts via SECURITY DEFINER RPC.
  const sellerIds = [...new Set(rows.map((r) => r.seller_id).filter(Boolean) as string[])]
  const sellerCountMap = new Map<string, number>()
  if (sellerIds.length > 0) {
    const { data: sellerData } = await supabase.rpc("fn_seller_completed_resales", {
      p_seller_ids: sellerIds,
    })
    for (const row of (sellerData ?? []) as { seller_id: string; completed_count: number }[]) {
      sellerCountMap.set(row.seller_id, row.completed_count)
    }
  }

  const all = rows.map((r) => mapPublicRow(r, sellerCountMap))

  // Price stats over the full active pool (pre-filter) so the numbers stay
  // stable while the buyer filters by ticket type.
  let priceStats: ResalePriceStats | null = null
  if (all.length > 0) {
    let minCents = all[0].priceCents
    let maxCents = all[0].priceCents
    let totalCents = 0
    for (const listing of all) {
      if (listing.priceCents < minCents) minCents = listing.priceCents
      if (listing.priceCents > maxCents) maxCents = listing.priceCents
      totalCents += listing.priceCents
    }
    priceStats = {
      minCents,
      maxCents,
      avgCents: Math.round(totalCents / all.length),
      count: all.length,
      currency: all[0].currency,
    }
  }

  // Distinct ticket types across the full active set (so filter chips stay
  // stable regardless of the active filter).
  const seen = new Map<string, ResaleTicketTypeOption>()
  for (const listing of all) {
    if (listing.ticketTypeId && !seen.has(listing.ticketTypeId)) {
      seen.set(listing.ticketTypeId, {
        id: listing.ticketTypeId,
        name: listing.ticketTypeName ?? "Ticket",
      })
    }
  }
  const ticketTypes = Array.from(seen.values())

  const listings = opts.ticketTypeId
    ? all.filter((listing) => listing.ticketTypeId === opts.ticketTypeId)
    : all

  return { listings, ticketTypes, priceStats }
}

export async function getPublicTicketListing(listingId: string): Promise<PublicEventTicketListing | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("resale_listings")
    .select(PUBLIC_LISTING_SELECT)
    .eq("id", listingId)
    .eq("status", "active")
    .maybeSingle()

  if (error) {
    console.error("[ticket-listings] public listing detail:", error)
    return null
  }

  if (!data) return null
  const row = data as PublicTicketListingRow
  const sellerCountMap = new Map<string, number>()
  if (row.seller_id) {
    const { data: sellerData } = await supabase.rpc("fn_seller_completed_resales", {
      p_seller_ids: [row.seller_id],
    })
    for (const s of (sellerData ?? []) as { seller_id: string; completed_count: number }[]) {
      sellerCountMap.set(s.seller_id, s.completed_count)
    }
  }
  return mapPublicRow(row, sellerCountMap)
}
