import { createBrowserClient } from "@supabase/ssr"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("Supabase environment variables are not configured. Some features will be limited.")
    // Return null to indicate Supabase is not configured
    return null
  }

  return createBrowserClient(url, key)
}
