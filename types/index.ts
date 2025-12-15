export interface UserProfile {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  phone?: string | null
  created_at: string
  updated_at: string
}

export interface VenueRecord {
  id: string
  name: string
  description?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  region?: string | null
  postal_code?: string | null
  country?: string | null
  latitude?: number | null
  longitude?: number | null
  capacity?: number | null
  created_at: string
  updated_at: string
}

export interface EventRecord {
  id: string
  organizer_id: string
  slug?: string | null
  title: string
  summary?: string | null
  description: string
  full_description?: string | null
  cover_image_url?: string | null
  banner_image_url?: string | null
  category?: string | null
  subcategory?: string | null
  status: "draft" | "published" | "archived" | "cancelled"
  visibility: "public" | "private" | "unlisted"
  currency: string
  venue_id?: string | null
  timezone: string
  capacity?: number | null
  tickets_available?: number | null
  tickets_sold?: number | null
  starts_at?: string | null
  ends_at?: string | null
  created_at: string
  updated_at: string
  published_at?: string | null
}

export interface EventDateRecord {
  id: string
  event_id: string
  starts_at: string
  ends_at: string
  doors_at?: string | null
  timezone: string
  label?: string | null
  is_primary: boolean
  capacity?: number | null
  created_at: string
  updated_at: string
}

export interface TicketTypeRecord {
  id: string
  event_id: string
  name: string
  description?: string | null
  price: number
  currency: string
  fee_fixed?: number | null
  fee_percent?: number | null
  absorb_fees?: boolean | null
  quantity_total: number
  quantity_remaining: number
  sales_start?: string | null
  sales_end?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface EventArtistRecord {
  id: string
  event_id: string
  artist_id: string
  display_order: number
}

export interface ArtistRecord {
  id: string
  name: string
  role?: string | null
  bio?: string | null
  avatar_url?: string | null
  banner_url?: string | null
  website_url?: string | null
  twitter?: string | null
  instagram?: string | null
  youtube?: string | null
  created_at: string
  updated_at: string
}

export interface OrderRecord {
  id: string
  event_id: string
  purchaser_id: string
  purchaser_email: string
  purchaser_first_name?: string | null
  purchaser_last_name?: string | null
  status: "pending" | "completed" | "cancelled" | "refunded"
  subtotal_amount: number
  fee_amount: number
  total_amount: number
  currency: string
  payment_reference?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface OrderItemRecord {
  id: string
  order_id: string
  event_id: string
  ticket_type_id: string
  quantity: number
  unit_price: number
  subtotal_amount: number
  fee_amount: number
  total_amount: number
  currency: string
  created_at: string
  updated_at: string
}

export interface TicketRecord {
  id: string
  order_item_id: string
  event_id: string
  ticket_type_id: string
  attendee_id?: string | null
  attendee_first_name?: string | null
  attendee_last_name?: string | null
  attendee_email?: string | null
  status: "pending" | "issued" | "checked_in" | "void"
  qr_code: string
  barcode?: string | null
  metadata?: Record<string, any> | null
  minted_at: string
  checked_in_at?: string | null
  created_at: string
  updated_at: string
}

export interface ScanRecord {
  id: string
  ticket_id: string
  event_id: string
  order_id?: string | null
  device_id: string
  device_session_id?: string | null
  code: string
  status: "valid" | "duplicate" | "invalid" | "offline"
  location?: string | null
  scanned_at: string
  synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface DeviceRecord {
  id: string
  name: string
  secret?: string | null
  last_seen_at?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface DeviceSessionRecord {
  id: string
  device_id: string
  event_id: string
  started_at: string
  ended_at?: string | null
  status: "active" | "closed"
  created_at: string
  updated_at: string
}

export interface SeatMapRecord {
  id: string
  event_id: string
  name: string
  description?: string | null
  schema: Record<string, any>
  created_at: string
  updated_at: string
}

export interface LedgerEntryRecord {
  id: string
  event_id: string
  order_id?: string | null
  type: "charge" | "payout" | "refund" | "adjustment"
  amount: number
  currency: string
  occurred_at: string
  balance_after?: number | null
  description?: string | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface PromoCodeRecord {
  id: string
  event_id?: string | null
  code: string
  type: "percentage" | "fixed"
  value: number
  currency?: string | null
  max_uses?: number | null
  used_count: number
  valid_from?: string | null
  valid_until?: string | null
  min_purchase_amount?: number | null
  active: boolean
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface PromoCodeUsageRecord {
  id: string
  promo_code_id: string
  order_id: string
  discount_amount: number
  used_at: string
  created_at: string
}

export interface WaitlistRecord {
  id: string
  event_id: string
  ticket_type_id?: string | null
  user_id?: string | null
  email: string
  first_name?: string | null
  last_name?: string | null
  quantity_requested: number
  status: "active" | "offered" | "purchased" | "expired" | "cancelled"
  offer_expires_at?: string | null
  notified_at?: string | null
  joined_at: string
  created_at: string
  updated_at: string
}

export interface TicketTransferRecord {
  id: string
  ticket_id: string
  from_user_id: string
  to_user_id?: string | null
  to_email?: string | null
  status: "pending" | "accepted" | "rejected" | "cancelled" | "expired"
  transfer_code?: string | null
  expires_at?: string | null
  transferred_at?: string | null
  created_at: string
  updated_at: string
}

export interface ResaleListingRecord {
  id: string
  ticket_id: string
  seller_id: string
  price: number
  currency: string
  status: "active" | "sold" | "cancelled" | "expired"
  buyer_id?: string | null
  sold_at?: string | null
  expires_at?: string | null
  created_at: string
  updated_at: string
}

export interface GuestlistRecord {
  id: string
  event_id: string
  name: string
  email?: string | null
  phone?: string | null
  status: "invited" | "confirmed" | "declined" | "cancelled"
  tickets_allocated?: number | null
  tickets_redeemed?: number | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface EventSummary {
  id: string
  slug?: string | null
  title: string
  summary?: string | null
  description: string
  category?: string | null
  status: EventRecord["status"]
  currency: string
  cover_image_url?: string | null
  venue_name?: string | null
  location?: string | null
  starts_at?: string | null
  ends_at?: string | null
  minimum_price?: number | null
  tickets_available?: number | null
  tickets_sold?: number | null
  organizer_id?: string | null
}

export interface EventDetail extends EventSummary {
  full_description?: string | null
  banner_image_url?: string | null
  timezone: string
  ticket_types: TicketTypeRecord[]
  dates: EventDateRecord[]
  venue?: VenueRecord | null
  artists?: Array<{
    id: string
    name: string
    role?: string | null
    bio?: string | null
    image_url?: string | null
    avatar_url?: string | null
  }> | null
}
