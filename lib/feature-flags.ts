import "server-only"

import { cache } from "react"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Platform feature gating (TICK-346).
 *
 * public.feature_flags has existed since the phase-2 work and the super-admin
 * console can edit it, but until now nothing outside that console ever read it.
 * pos_enabled, resale_enabled and waitlist_enabled were all false while every
 * page, server action and API route behind them stayed fully reachable -- the
 * flags described an intent that nothing enforced.
 *
 * These helpers are that enforcement. Gate both halves of a feature: the page,
 * so it does not render, and the server action or route handler, so a direct
 * POST cannot reach the mutation regardless of what the UI shows.
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

export async function isFeatureEnabled(key: PlatformFeatureKey): Promise<boolean> {
  const flags = await getPlatformFeatureFlags()
  return flags[key] === true
}

/**
 * Throw unless the feature is on. For server actions and route handlers, where
 * the caller may be a direct POST rather than the rendered UI.
 *
 * The message is deliberately generic -- a disabled feature should look absent,
 * not merely switched off.
 */
export async function assertFeatureEnabled(key: PlatformFeatureKey): Promise<void> {
  if (!(await isFeatureEnabled(key))) {
    throw new Error("This feature is not available.")
  }
}
