import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env"

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Cookie writes are wrapped in try/catch because Server Components are read-only;
 * middleware handles session refresh there.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
