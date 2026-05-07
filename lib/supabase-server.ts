import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Legacy synchronous wrapper kept for compatibility with the many existing
 * pages that call `const supabase = createServerSupabaseClient()`.
 *
 * Next.js 16 requires `await cookies()`. We satisfy that by making the cookie
 * adapter callbacks async — @supabase/ssr awaits them when it needs cookies.
 *
 * For new code, prefer `import { createClient } from "@/lib/supabase/server"`.
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null
  }

  return createServerClient(url, key, {
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
