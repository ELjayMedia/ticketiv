/**
 * Application record types.
 *
 * These mirror the real Supabase schema (public schema tables + the
 * `v_*_public` views). Money is stored in integer minor units (`*_cents`).
 * Orders are organization-scoped; an order's event is derived from its
 * items' ticket types. An `order_item` IS a ticket (one row per ticket,
 * carrying a `ticket_code`) — there is no separate `tickets` table.
 */

export type OrderStatus = "pending" | "paid" | "failed" | "refunded"
export type OrderItemStatus =
  | "pending"
  | "issued"
  | "transferred"
  | "checked_in"
  | "revoked"
  | "refunded"
export type EventStatus = "draft" | "published" | "archived" | "cancelled"
export type EventVisibility = "public" | "unlisted" | "private"
export type EventFormat = "single_day" | "multi_day" | "series"
export type TicketTypeSalesStatus = "on_sale" | "paused" | "sold_out" | "hidden"
export type SalesChannel = "online" | "pos" | "reseller" | "import"
export type TransferStatus =
  | "requested"
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed"
export type PriceRuleType =
  | "absolute_discount"
  | "percent_discount"
  | "abs_fee"
  | "percent_fee"
  | "tax"
export type ScanOutcome = "valid" | "already_used" | "revoked" | "invalid" | "wrong_event"

// public.profiles (primary key: user_id)
export interface UserProfile {
  user_id: string
  display_name?: string | null
  name?: string | null
  surname?: string | null
  phone?: string | null
  role?: string | null
  created_at: string
}

// public.venues
export interface VenueRecord {
  id: string
  org_id: string
  name: string
  address?: string | null
  city?: string | null
  tz?: string | null
  capacity?: number | null
  slug?: string | null
  created_at: string
}

// public.events
export interface EventRecord {
  id: string
  org_id: string
  venue_id: string
  title: string
  slug: string
  status: EventStatus
  visibility: EventVisibility
  event_format: EventFormat
  description?: string | null
  cover_image_url?: string | null
  category?: string | null
  city?: string | null
  country_code?: string | null
  tz?: string | null
  starts_at?: string | null
  ends_at?: string | null
  publish_at?: string | null
  unpublish_at?: string | null
  published_at?: string | null
  series_id?: string | null
  refund_policy?: string | null
  confirmation_message?: string | null
  attendee_fields: unknown
  created_by?: string | null
  created_at: string
}

// public.event_dates
export interface EventDateRecord {
  id: string
  event_id: string
  starts_at: string
  ends_at: string
  created_at: string
  updated_at: string
}

// public.ticket_types
export interface TicketTypeRecord {
  id: string
  event_id: string
  name: string
  price_cents: number
  currency: string
  quota: number
  per_user_limit?: number | null
  is_reserved_seating?: boolean | null
  sales_status: TicketTypeSalesStatus
  sales_paused_at?: string | null
  sales_pause_reason?: string | null
  created_at: string
  updated_at: string
}

// public.event_artists (composite key: event_id + artist_id)
export interface EventArtistRecord {
  event_id: string
  artist_id: string
  role?: string | null
}

// public.artists
export interface ArtistRecord {
  id: string
  org_id: string
  name: string
  bio?: string | null
  image_url?: string | null
  slug?: string | null
  primary_user_id?: string | null
  created_at: string
  updated_at: string
}

// public.orders (organization-scoped; not event-scoped)
export interface OrderRecord {
  id: string
  org_id: string
  buyer_id?: string | null
  status: OrderStatus
  channel: SalesChannel
  currency: string
  subtotal_cents?: number | null
  total_cents: number
  platform_fee_cents?: number | null
  processor_fee_cents?: number | null
  item_count?: number | null
  buyer_email?: string | null
  buyer_phone?: string | null
  email?: string | null
  phone?: string | null
  device_id?: string | null
  pricing_plan_id?: string | null
  created_at: string
}

// public.order_items — one row per ticket (carries the scannable ticket_code)
export interface OrderItemRecord {
  id: string
  order_id: string
  ticket_type_id: string
  seat_id?: string | null
  ticket_code: string
  status: OrderItemStatus
  name?: string | null
  holder_name?: string | null
  holder_email?: string | null
  holder_phone?: string | null
  checked_in_at?: string | null
  revoked_at?: string | null
  refunded_at?: string | null
  transferred_from_order_item_id?: string | null
  created_at: string
  updated_at: string
}

/**
 * A "Ticket" in the frontend is an order_item in Supabase.
 * Do NOT query a `tickets` table — it does not exist.
 */
export type Ticket = OrderItemRecord
export type TicketRecord = OrderItemRecord

// public.scans
export interface ScanRecord {
  id: string
  event_id: string
  order_item_id?: string | null
  ticket_code: string
  outcome: ScanOutcome
  device_id?: string | null
  device_session_id?: string | null
  gate?: string | null
  notes?: string | null
  scanned_at: string
}

// public.devices
export interface DeviceRecord {
  id: string
  org_id: string
  event_id?: string | null
  label?: string | null
  device_role: string
  registered_by?: string | null
  max_scans_per_minute?: number | null
  last_seen_at?: string | null
  created_at: string
}

// public.device_sessions
export interface DeviceSessionRecord {
  id: string
  device_id: string
  user_id?: string | null
  started_at: string
  ended_at?: string | null
}

// public.seat_maps
export interface SeatMapRecord {
  id: string
  event_id: string
  schema: unknown
  created_at: string
}

// public.ledger_entries
export interface LedgerEntryRecord {
  id: string
  org_id: string
  event_id?: string | null
  order_id?: string | null
  payment_id?: string | null
  refund_id?: string | null
  payout_id?: string | null
  type: "order_gross" | "fee" | "tax" | "discount" | "payment_net" | "refund" | "payout"
  amount_cents: number
  currency: string
  meta?: unknown
  occurred_at: string
}

// public.payments
export interface PaymentRecord {
  id: string
  order_id: string
  provider: string
  amount_cents: number
  currency: string
  status?: string | null
  ext_payment_id?: string | null
  payload?: unknown
  created_at: string
}

// public.payment_methods
export interface PaymentMethodRecord {
  id: string
  user_id: string
  provider: string
  method_type: string
  brand?: string | null
  last4?: string | null
  exp_month?: number | null
  exp_year?: number | null
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * public.price_rules — coded discounts/fees. Promo codes are price_rules
 * with a non-null `code`.
 */
export interface PriceRuleRecord {
  id: string
  org_id: string
  event_id?: string | null
  ticket_type_id?: string | null
  code?: string | null
  type: PriceRuleType
  value_numeric: number
  applies_to: "item" | "order"
  channel: SalesChannel[]
  starts_at?: string | null
  ends_at?: string | null
  max_redemptions?: number | null
  per_user_limit?: number | null
  is_active: boolean
  created_at: string
}

// public.price_rule_redemptions
export interface PriceRuleRedemptionRecord {
  id: string
  price_rule_id: string
  user_id?: string | null
  order_id?: string | null
  redeemed_at: string
}

/** Back-compat aliases: the schema has no promo_codes/promo_code_usage tables. */
export type PromoCodeRecord = PriceRuleRecord
export type PromoCodeUsageRecord = PriceRuleRedemptionRecord

// public.order_adjustments
export interface OrderAdjustmentRecord {
  id: string
  order_id: string
  price_rule_id?: string | null
  type: string
  scope?: string | null
  target_order_item_id?: string | null
  amount_cents: number
  label?: string | null
  created_at: string
}

// public.waitlists
export interface WaitlistRecord {
  id: string
  event_id: string
  ticket_type_id?: string | null
  user_id?: string | null
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  quantity_requested: number
  status: "active" | "offered" | "converted" | "expired" | "cancelled"
  offer_expires_at?: string | null
  notified_at?: string | null
  joined_at: string
  created_at: string
}

// public.transfers
export interface TicketTransferRecord {
  id: string
  order_item_id?: string | null
  from_user_id?: string | null
  to_user_id?: string | null
  status: TransferStatus
  metadata?: unknown
  created_at: string
  updated_at: string
}

// public.resale_listings
export interface ResaleListingRecord {
  id: string
  order_item_id: string
  seller_id?: string | null
  org_id: string
  price_cents: number
  currency: string
  status: "active" | "sold" | "cancelled" | "expired"
  transfer_fee_cents?: number | null
  transfer_id?: string | null
  listing_expires_at?: string | null
  metadata?: unknown
  created_at: string
  updated_at: string
}

// public.guestlist_entries
export interface GuestlistRecord {
  id: string
  event_id: string
  ticket_type_id?: string | null
  full_name: string
  email?: string | null
  phone?: string | null
  allocation: number
  notes?: string | null
  created_by?: string | null
  created_at: string
}

/** Shape of a row from the `v_events_public` view (public events listing). */
export interface EventSummary {
  id: string
  title: string
  slug: string
  category?: string | null
  city?: string | null
  country?: string | null
  poster_url?: string | null
  starts_at: string
  venue_id?: string | null
  venue_name?: string | null
  venue_address?: string | null
  venue_tz?: string | null
  min_price_cents?: number | null
  max_price_cents?: number | null
  currency?: string | null
  organizer_id?: string | null
  organizer_name?: string | null
  organizer_logo_url?: string | null
}

/** Shape of a row from the `v_event_public` view (single public event). */
export interface EventDetail extends EventSummary {
  description?: string | null
  visibility: EventVisibility
  venue_capacity?: number | null
  ticket_types?: TicketTypeRecord[]
  dates?: EventDateRecord[]
  artists?: Array<Pick<ArtistRecord, "id" | "name" | "bio" | "image_url" | "slug">>
}
