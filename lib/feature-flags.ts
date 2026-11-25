import "server-only"

import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"
import { featureOpenFor, type FeatureExclusion, type FeatureScope } from "@/lib/feature-flags-core"

export type { FeatureScope } from "@/lib/feature-flags-core"

/**
 * Platform feature gating (TICK-346), with per-organisation and per-event
 * exclusions.
 *
 * Gate both halves of a feature: the page, so it does not render, and the
 * server action or route handler, so a direct POST cannot reach the mutation
 * regardless of what the UI shows. Pass the event (and organisation, when
 * known) the request is about, so an exclusion set in the command centre
 * applies; an organisation exclusion covers all of its events.
 */

export type PlatformFeatureKey =
  | "guestlist_enabled"
  | "notifications_enabled"
  | "series_enabled"
  | "pos_enabled"
  | "resale_enabled"
  | "waitlist_enabled"

/**
 * Read the platform-level flags (org_id is null).
 *
 * Deliberately fails CLOSED. If the flag table cannot be read, an unlaunched
 * feature staying shut is a broken page; an unlaunched feature opening because
 * of a transient database error is real money moving through a path nobody has
 * signed off. Callers that want the opposite must handle it explicitly.
 */
export const getPlatformFeatureFlags = cache(async (): Promise<Record<string, boolean>> => {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("feature_flags")
      .select("key, enabled")
      .is("org_id", null)

    if (error) {
      console.error("[feature-flags] read failed, failing closed", error)
      return {}
    }

    return Object.fromEntries((data ?? []).map((row) => [row.key, Boolean(row.enabled)]))
  } catch (error) {
    console.error("[feature-flags] read threw, failing closed", error)
    return {}
  }
})

/** Exclusions for one flag, or null when they can't be read (callers fail closed). */
const getFlagExclusions = cache(async (key: string): Promise<FeatureExclusion[] | null> => {
  try {
    const admin = createAdminClient() as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (c: string, v: string) => Promise<{ data: unknown; error: unknown }> } }
    }
    const { data, error } = await admin.from("feature_flag_exclusions").select("org_id, event_id").eq("flag_key", key)
    if (error) {
      console.error("[feature-flags] exclusions read failed, failing closed", error)
      return null
    }
    return ((data as { org_id: string | null; event_id: string | null }[] | null) ?? []).map((row) => ({
      orgId: row.org_id,
      eventId: row.event_id,
    }))
  } catch (error) {
    console.error("[feature-flags] exclusions read threw, failing closed", error)
    return null
  }
})

/** The organisation an event belongs to, so organisation exclusions apply to it. */
const getEventOrgId = cache(async (eventId: string): Promise<string | null | undefined> => {
  try {
    const { data, error } = await createAdminClient().from("events").select("org_id").eq("id", eventId).maybeSingle()
    if (error) return undefined
    return data?.org_id ?? null
  } catch {
    return undefined
  }
})

export async function isFeatureEnabled(key: PlatformFeatureKey, scope: FeatureScope = {}): Promise<boolean> {
  const flags = await getPlatformFeatureFlags()
  if (flags[key] !== true) return false
  if (!scope.orgId && !scope.eventId) return true

  const exclusions = await getFlagExclusions(key)
  if (exclusions === null) return false
  if (exclusions.length === 0) return true

  let orgId = scope.orgId ?? null
  if (!orgId && scope.eventId) {
    const resolved = await getEventOrgId(scope.eventId)
    if (resolved === undefined) return false
    orgId = resolved
  }
  return featureOpenFor(true, exclusions, { orgId, eventId: scope.eventId ?? null })
}

/**
 * Throw unless the feature is on (for this organisation / event). For server
 * actions and route handlers, where the caller may be a direct POST rather
 * than the rendered UI.
 *
 * The message is deliberately generic -- a disabled feature should look absent,
 * not merely switched off.
 */
export async function assertFeatureEnabled(key: PlatformFeatureKey, scope: FeatureScope = {}): Promise<void> {
  if (!(await isFeatureEnabled(key, scope))) {
    throw new Error("This feature is not available.")
  }
}

/** The event a resale listing is for (listing → order item → ticket type → event). */
export async function eventIdForResaleListing(listingId: string): Promise<string | null> {
  try {
    const { data } = await (createAdminClient() as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } }
      }
    })
      .from("resale_listings")
      .select("order_items:order_item_id(ticket_types:ticket_type_id(event_id))")
      .eq("id", listingId)
      .maybeSingle()
    const row = data as { order_items?: { ticket_types?: { event_id?: string | null } | null } | null } | null
    return row?.order_items?.ticket_types?.event_id ?? null
  } catch {
    return null
  }
}

/** The event a waitlist entry is for. */
export async function eventIdForWaitlist(waitlistId: string): Promise<string | null> {
  try {
    const { data } = await createAdminClient().from("waitlists").select("event_id").eq("id", waitlistId).maybeSingle()
    return (data as { event_id?: string | null } | null)?.event_id ?? null
  } catch {
    return null
  }
}

/** The event an order item (a ticket) is for. */
export async function eventIdForOrderItem(orderItemId: string): Promise<string | null> {
  try {
    const { data } = await (createAdminClient() as unknown as {
      from: (t: string) => {
        select: (c: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } }
      }
    })
      .from("order_items")
      .select("ticket_types:ticket_type_id(event_id)")
      .eq("id", orderItemId)
      .maybeSingle()
    return (data as { ticket_types?: { event_id?: string | null } | null } | null)?.ticket_types?.event_id ?? null
  } catch {
    return null
  }
}
