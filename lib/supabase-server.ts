import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getSupabasePublicConfig } from "./env-public"
import type { Database } from "@/types/database"

/**
 * Legacy synchronous wrapper kept for compatibility with existing pages that
 * call `const supabase = createServerSupabaseClient()`.
 *
 * The helper intentionally returns null when public Supabase config is missing
 * so public routes can render degraded empty states instead of crashing during
 * server render.
 */
export function createServerSupabaseClient() {
  const config = getSupabasePublicConfig()

  if (!config) {
    return null
  }

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      async getAll() {
        const cookieStore = await cookies()
        return cookieStore.getAll()
      },
      async setAll(cookiesToSet) {
        try {
          const cookieStore = await cookies()
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Component context — middleware handles refresh
        }
      },
    },
  })
}
