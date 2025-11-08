import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createClient() {
  if (typeof window === "undefined") {
    const cookieStore = cookies()

    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // `setAll` may be invoked within a Server Component where the cookies API is read-only.
          }
        },
      },
    })
  }

  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}
