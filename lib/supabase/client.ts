import { createBrowserClient } from "@supabase/ssr"
import { getRequiredSupabasePublicConfig } from "@/lib/env-public"
import type { Database } from "@/types/database"

export function createClient() {
  const config = getRequiredSupabasePublicConfig()

  return createBrowserClient<Database>(config.url, config.anonKey)
}
