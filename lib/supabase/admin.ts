import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getRequiredSupabaseAdminConfig } from "@/lib/env"
import type { Database } from "@/types/database"

export function createAdminClient() {
  const config = getRequiredSupabaseAdminConfig()

  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
