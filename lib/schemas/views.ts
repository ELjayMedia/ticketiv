import { z } from "zod"

/**
 * Zod schemas for Supabase VIEWS
 * These define the contract between the database views and the frontend adapters.
 * All frontend data queries should validate against these schemas.
 */

// v_events_public: List of public events with aggregated pricing/venue info
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

// v_my_tickets: Authenticated user tickets
export const MyTicketsViewSchema = z.object({
  user_id: z.string().uuid(),
  order_id: z.string().uuid(),
  order_item_id: z.string().uuid(),
  event_id: z.string().uuid(),
  event_title: z.string(),
  event_slug: z.string(),
  starts_at: z.string().datetime({ offset: true }),
  ends_at: z.string().datetime({ offset: true }).nullable(),
  venue_name: z.string().nullable(),
  venue_address: z.string().nullable(),
  ticket_type_name: z.string(),
  qr_token: z.string(),
  checked_in_at: z.string().datetime({ offset: true }).nullable(),
  revoked_at: z.string().datetime({ offset: true }).nullable(),
  transferred_at: z.string().datetime({ offset: true }).nullable(),
  status: z.enum(["active", "checked_in", "revoked", "transferred"]),
})

export type MyTicketsView = z.infer<typeof MyTicketsViewSchema>

// v_event_kpis: Key performance indicators for an event
export const EventKPIsViewSchema = z.object({
  event_id: z.string().uuid(),
  event_title: z.string(),
  event_date: z.string().datetime({ offset: true }),
  total_tickets_sold: z.number().int().nonnegative(),
  total_revenue_cents: z.number().int().nonnegative(),
  total_checked_in: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative().nullable(),
  attendance_rate: z.number().min(0).max(1),
  avg_ticket_price_cents: z.number().int().nonnegative(),
})

export type EventKPIsView = z.infer<typeof EventKPIsViewSchema>

export type MyTicketsView = z.infer<typeof MyTicketsViewSchema>

/**
 * Utility function to validate and log schema mismatches
 * Call this in development to catch schema drift early
 */
export function validateSchema<T>(schema: z.Schema<T>, data: unknown, source: string): T {
  const result = schema.safeParse(data)

  if (!result.success) {
    const errors = result.error.issues
    console.error(`[v0] Schema validation failed for ${source}:`, errors)

    if (process.env.NODE_ENV === "development") {
      throw new Error(
        `Schema validation failed for ${source}: ${errors.map((e) => `${e.path.join(".")} - ${e.message}`).join("; ")}`,
      )
    }

    // In production, return null to trigger graceful error UI
    return null as any
  }

  return result.data
}
