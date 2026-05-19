import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { getRequiredSupabasePublicConfig } from "@/lib/env"

/**
 * Supabase client for authenticated Server Components, Server Actions, and
 * Route Handlers. Public/degraded routes should use createServerSupabaseClient()
 * from lib/supabase-server.ts because this helper intentionally requires config.
 */
export async function createClient() {
  const config = getRequiredSupabasePublicConfig()
  const cookieStore = await cookies()

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
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
