import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env"
import type { Database } from "@/types/database"

export function createClient() {
  const url = SUPABASE_URL
  const key = SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("Supabase environment variables are not configured. Some features will be limited.")
    // Return null to indicate Supabase is not configured
    return null
  }

  return createBrowserClient<Database>(url, key)
}
