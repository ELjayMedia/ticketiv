import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getRequiredSupabaseAdminConfig } from "@/lib/env"

export function createAdminClient() {
  const config = getRequiredSupabaseAdminConfig()

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
