import "server-only"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"

import { loadContexts } from "@/lib/data/identity/contexts"
import { getRequiredSupabasePublicConfig } from "@/lib/env-public"
import { getActiveContextKey, pickLanding, PERSONAL_LANDING } from "@/lib/identity/context"
import type { Database } from "@/types/database"

/**
 * Where a user who just signed in should land (same rules as /launch:
 * last-used context, else their organisation, else Discover), worked out in the
 * login request itself from the fresh session. This replaces the extra hop
 * through /launch, which re-verified the session in the proxy and again in the
 * page before redirecting.
 */
export async function landingForSession(accessToken: string, userId: string): Promise<string> {
  try {
    const config = getRequiredSupabasePublicConfig()
    // The cookie-backed client only sees the new session on the next request,
    // so read the roles with the access token we were just given.
    const supabase = createSupabaseClient<Database>(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })
    const [contexts, lastKey] = await Promise.all([loadContexts(supabase, userId), getActiveContextKey()])
    return pickLanding(contexts, lastKey)
  } catch (error) {
    console.error("[auth] landing lookup failed:", error)
    return PERSONAL_LANDING
  }
}
