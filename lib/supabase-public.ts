import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getSupabasePublicConfig } from "./env"

/**
 * Cookie-free Supabase client for cacheable public reads.
 *
 * Use this only for anonymous public read models such as event discovery and
 * event detail summaries. Anything that needs auth, RLS scoped to the current
 * user, checkout state, payment state, organizer operations, scanner sessions,
 * or admin data must continue using the server/client auth-aware helpers.
 */
export function createPublicSupabaseClient() {
  const config = getSupabasePublicConfig()

  if (!config) {
    return null
  }

  return createSupabaseClient(config.url, config.anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}
