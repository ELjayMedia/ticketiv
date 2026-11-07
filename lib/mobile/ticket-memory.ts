import "server-only"

import { eventTimeZone, formatEventDate, formatTimeRange, type CompanionMemory } from "@ticketiv/shared"

import { createAdminClient } from "@/lib/supabase/admin"
import { verifyTicketToken } from "@/lib/ticket-tokens"

/**
 * Event memory for the mobile app, which holds tickets by their signed
 * delivery link rather than a login. The link proves the holder, so these
 * helpers act for that ticket's current owner (else its buyer) and apply the
 * same rules as the web RPCs: live ticket, event started, rating 1-5.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = { from: (table: string) => any }

export class TicketMemoryError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export interface TicketHolder {
  userId: string
  eventId: string
  orgId: string | null
  orgName: string | null
  startsAt: string | null
}

/** Resolve a delivery token to the ticket's holder. Throws TicketMemoryError. */
export async function resolveTicketHolder(token: string): Promise<{ admin: Admin; holder: TicketHolder }> {
  const verification = verifyTicketToken(token)
  if (!verification.ok) {
    throw new TicketMemoryError(verification.reason === "expired" ? "link_expired" : "invalid_link", verification.reason === "expired" ? 410 : 404)
  }
  const admin = createAdminClient() as unknown as Admin
  const { data: item } = await admin
    .from("order_items")
    .select("status, current_owner_id, orders(buyer_id), ticket_types(event_id, events(id, org_id, starts_at, organizations(name)))")
    .eq("id", verification.orderItemId)
    .maybeSingle()
  const event = item?.ticket_types?.events
  const userId = item?.current_owner_id ?? item?.orders?.buyer_id ?? null
  if (!item || !event || !userId) throw new TicketMemoryError("ticket_not_found", 404)
  if (item.status !== "issued" && item.status !== "checked_in") throw new TicketMemoryError("ticket_not_valid", 403)
  return {
    admin,
    holder: { userId, eventId: event.id, orgId: event.org_id ?? null, orgName: event.organizations?.name ?? null, startsAt: event.starts_at ?? null },
  }
}

export async function loadTicketMemory(admin: Admin, holder: TicketHolder): Promise<CompanionMemory> {
  const nowIso = new Date().toISOString()
  const [feedbackRes, highlightsRes, followRes, sameOrgRes] = await Promise.all([
    admin.from("event_feedback").select("rating").eq("event_id", holder.eventId).eq("user_id", holder.userId).maybeSingle(),
    admin.from("event_highlights").select("id, image_url, caption").eq("event_id", holder.eventId).order("position").limit(12),
    holder.orgId ? admin.from("org_follows").select("org_id").eq("org_id", holder.orgId).eq("user_id", holder.userId).maybeSingle() : Promise.resolve({ data: null }),
    holder.orgId
      ? admin
          .from("v_public_event_cards")
          .select("slug, title, starts_at, venue_tz")
          .eq("organizer_id", holder.orgId)
          .neq("id", holder.eventId)
          .gt("starts_at", nowIso)
          .order("starts_at")
          .limit(3)
      : Promise.resolve({ data: [] }),
  ])
  return {
    orgId: holder.orgId,
    following: Boolean(followRes.data),
    myRating: feedbackRes.data?.rating ?? null,
    highlights: ((highlightsRes.data ?? []) as Array<{ id: string; image_url: string; caption: string | null }>).map((h) => ({
      id: h.id,
      imageUrl: h.image_url,
      caption: h.caption,
    })),
    suggestions: ((sameOrgRes.data ?? []) as Array<{ slug: string; title: string; starts_at: string | null; venue_tz: string | null }>).map((row) => {
      const tz = eventTimeZone(row.venue_tz)
      return {
        slug: row.slug,
        title: row.title,
        whenLabel: row.starts_at ? `${formatEventDate(row.starts_at, null, tz).toUpperCase()} · ${formatTimeRange(row.starts_at, null, tz)}` : "DATE TBA",
        reason: holder.orgName ? `More from ${holder.orgName}` : "Same organiser",
      }
    }),
  }
}

/** Same rules as fn_submit_event_feedback, for the link's holder. */
export async function submitTicketFeedback(admin: Admin, holder: TicketHolder, rating: unknown, comment: unknown): Promise<void> {
  const stars = Number(rating)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) throw new TicketMemoryError("Choose 1 to 5 stars", 400)
  const text = typeof comment === "string" ? comment.trim() : ""
  if (text.length > 1000) throw new TicketMemoryError("Keep your comment under 1000 characters", 400)
  if (!holder.startsAt || Date.parse(holder.startsAt) > Date.now()) throw new TicketMemoryError("You can rate the event once it has started", 400)
  const { error } = await admin
    .from("event_feedback")
    .upsert(
      { event_id: holder.eventId, user_id: holder.userId, rating: stars, comment: text || null, updated_at: new Date().toISOString() },
      { onConflict: "event_id,user_id" },
    )
  if (error) throw new TicketMemoryError("Couldn't save your rating", 500)
}

export async function setTicketOrgFollow(admin: Admin, holder: TicketHolder, follow: unknown): Promise<boolean> {
  if (!holder.orgId) throw new TicketMemoryError("Organiser not found", 404)
  const on = follow === true
  const { error } = on
    ? await admin.from("org_follows").upsert({ user_id: holder.userId, org_id: holder.orgId }, { onConflict: "user_id,org_id", ignoreDuplicates: true })
    : await admin.from("org_follows").delete().eq("user_id", holder.userId).eq("org_id", holder.orgId)
  if (error) throw new TicketMemoryError("Couldn't update that", 500)
  return on
}
