import "server-only"

import { cache } from "react"
import type { User } from "@supabase/supabase-js"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isExpectedSignedOutAuthError } from "@/lib/supabase/auth-errors"

/**
 * The signed-in user for this request, verified with Supabase Auth once.
 *
 * Layouts and pages ask for the user several times per render (profile for the
 * nav, contexts for the switcher, the page's own data). Each getUser() is a
 * network round trip to Supabase Auth, so it is memoised per request with
 * React's cache().
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) {
      if (!isExpectedSignedOutAuthError(error)) console.error("[auth] getUser error:", error)
      return null
    }
    return user
  } catch (error) {
    // During static prerender cookies() throws DYNAMIC_SERVER_USAGE: "no user".
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw error
    if (!isExpectedSignedOutAuthError(error)) console.error("[auth] getUser failed:", error)
    return null
  }
})
