import { createBrowserClient, createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("Supabase environment variables are not configured. Some features will be limited.")
    // Return a mock client that won't break the app
    return null as any
  }

  return createBrowserClient(url, key)
}

export async function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn("Supabase environment variables are not configured. Some features will be limited.")
    return null
  }

  const cookieStore = await cookies()

  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set(name, value, options)
        } catch (error) {
          // Handle cookie setting errors in server components
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set(name, "", options)
        } catch (error) {
          // Handle cookie removal errors in server components
        }
      },
    },
  })
}
