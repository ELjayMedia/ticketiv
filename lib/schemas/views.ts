import { z } from "zod"

/**
 * Zod schemas for Supabase VIEWS
 * These define the contract between the database views and the frontend adapters.
 * All frontend data queries should validate against these schemas.
 */

// v_public_event_cards / v_events_public: List of public events with aggregated pricing/venue/live stats info
export const EventsPublicViewSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  category: z.string().nullable(),
  city: z.string().nullable(),
  country: z.string().nullable(),
  poster_url: z.string().url().nullable(),
  starts_at: z.string().datetime({ offset: true }),
  venue_id: z.string().uuid().nullable(),
  venue_name: z.string().nullable(),
  venue_address: z.string().nullable(),
  venue_tz: z.string().nullable(),
  min_price_cents: z.number().int().nonnegative().nullable(),
  max_price_cents: z.number().int().nonnegative().nullable(),
  currency: z.string().nullable(),
  organizer_id: z.string().uuid().nullable(),
  organizer_name: z.string().nullable(),
  organizer_logo_url: z.string().url().nullable(),
  featured_priority: z.number().int().nullable().optional(),
  tickets_sold: z.number().int().nonnegative().optional(),
  tickets_available: z.number().int().nonnegative().optional(),
  checked_in_count: z.number().int().nonnegative().optional(),
  last_order_at: z.string().datetime({ offset: true }).nullable().optional(),
  last_scan_at: z.string().datetime({ offset: true }).nullable().optional(),
  live_stats_updated_at: z.string().datetime({ offset: true }).nullable().optional(),
})

export type EventsPublicView = z.infer<typeof EventsPublicViewSchema>

// v_event_public: Single event detail by slug
export const EventPublicViewSchema = EventsPublicViewSchema.extend({
  description: z.string().nullable(),
  visibility: z.enum(["public", "private", "unlisted"]),
  venue_capacity: z.number().int().nullable(),
})

export type EventPublicView = z.infer<typeof EventPublicViewSchema>

// v_organizer_public: Organizer profile
export const OrganizerPublicViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  bio: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  website: z.string().url().nullable(),
  social_links: z.record(z.string()).nullable(),
  event_count: z.number().int().nonnegative().nullable(),
})

export type OrganizerPublicView = z.infer<typeof OrganizerPublicViewSchema>

// v_organizer_events_public: Events by organizer (same shape as v_events_public)
export const OrganizerEventsPublicViewSchema = z.array(EventsPublicViewSchema)

export type OrganizerEventsPublicView = z.infer<typeof OrganizerEventsPublicViewSchema>

// v_artist_public: Artist profile
export const ArtistPublicViewSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  bio: z.string().nullable(),
  photo_url: z.string().url().nullable(),
  genre: z.string().nullable(),
  social_links: z.record(z.string()).nullable(),
})

export type ArtistPublicView = z.infer<typeof ArtistPublicViewSchema>

// v_artist_events_public: Events by artist (same shape as v_events_public)
export const ArtistEventsPublicViewSchema = z.array(EventsPublicViewSchema)

export type ArtistEventsPublicView = z.infer<typeof ArtistEventsPublicViewSchema>

// v_my_tickets: Authenticated user tickets (RLS-scoped to current user via buyer_id)
export const MyTicketsViewSchema = z.object({
  order_id: z.string().uuid(),
  buyer_id: z.string().uuid(),
  order_status: z.string(),
  ordered_at: z.string().datetime({ offset: true }).nullable(),
  order_item_id: z.string().uuid(),
  ticket_code: z.string(),
  checked_in_at: z.string().datetime({ offset: true }).nullable(),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
  ticket_type_id: z.string().uuid().nullable(),
  ticket_type_name: z.string().nullable(),
  price_cents: z.number().int().nonnegative().nullable(),
  currency: z.string().nullable(),
  event_id: z.string().uuid(),
  event_title: z.string(),
  event_slug: z.string(),
  city: z.string().nullable(),
  cover_image_url: z.string().nullable(),
  venue_name: z.string().nullable(),
  venue_address: z.string().nullable(),
  event_starts_at: z.string().datetime({ offset: true }).nullable(),
  order_item_status: z.enum(["pending", "issued", "transferred", "checked_in", "revoked", "refunded"]),
  refunded_at: z.string().datetime({ offset: true }).nullable(),
  transferred_from_order_item_id: z.string().uuid().nullable(),
  current_owner_id: z.string().uuid().nullable().optional(),
})

export type MyTicketsView = z.infer<typeof MyTicketsViewSchema>

// v_event_kpis: Per-event KPI aggregates for the organizer dashboard
export const EventKPIsViewSchema = z.object({
  org_id: z.string().uuid(),
  event_id: z.string().uuid(),
  title: z.string(),
  slug: z.string(),
  paid_orders: z.number().int().nonnegative(),
  tickets_issued: z.number().int().nonnegative(),
  tickets_checked_in: z.number().int().nonnegative(),
  revenue_cents: z.number().int().nonnegative(),
  currency: z.string().nullable(),
})

export type EventKPIsView = z.infer<typeof EventKPIsViewSchema>

/**
 * Utility function to validate and log schema mismatches
 * Call this in development to catch schema drift early
 */
export function validateSchema<T>(schema: z.Schema<T>, data: unknown, source: string): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues
    const summary = errors.map((e) => `${e.path.join(".") || "<root>"} - ${e.message}`).join("; ")
    console.error(`[v0] Schema validation failed for ${source}: ${summary}`)

    if (process.env.NODE_ENV === "development") {
      throw new Error(`Schema validation failed for ${source}: ${summary}`)
    }

    // In production we prefer to render with the raw row (logged above)
    // rather than crash downstream mappers with a `null`. Schema drift is
    // recoverable for most display paths; a null isn't.
    return data as T
  }

  return result.data
}
