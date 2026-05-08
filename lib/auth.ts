import { unstable_noStore as noStore } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSession, clearDemoSession } from "@/lib/demo-auth"
import { isUserAdmin } from "@/lib/data/admin"

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: string
  avatar_url?: string | null
  phone?: string | null
  created_at?: string
}

export interface UserSession {
  session: any
  profile: UserProfile | null
}

/**
 * SESSION MANAGEMENT STRATEGY
 * 
 * This module implements a comprehensive session management system with:
 * 
 * 1. PERSISTENT STORAGE: Supabase SSR automatically handles session persistence via HTTP-only cookies
 *    - Cookies are set on login via auth callback (/api/auth/callback)
 *    - Cookies are automatically validated on each request
 *    - Cookies expire after configurable token lifetime (default 1 hour for access, 7 days for refresh)
 * 
 * 2. SESSION VALIDATION: Server-side session validation on every protected page/route
 *    - getCurrentUserProfile() validates session and retrieves user profile
 *    - Returns null if session is invalid or expired
 *    - Forces re-authentication flow on failure
 * 
 * 3. AUTOMATIC RENEWAL: Supabase SSR handles token refresh automatically
 *    - Refresh token is stored securely in HTTP-only cookie
 *    - On each request, SSR checks if access token is near expiry
 *    - If near expiry, automatically exchanges refresh token for new access token
 *    - Middleware ensures this happens before route handlers execute
 * 
 * 4. LOGOUT INVALIDATION: Session cleared completely on logout
 *    - clearDemoSession() clears in-memory demo session
 *    - signOutUser() triggers Supabase auth.signOut() on client
 *    - Supabase removes all session cookies
 *    - Subsequent requests to protected pages redirect to login
 * 
 * 5. CROSS-BROWSER/DEVICE COMPATIBILITY
 *    - HTTP-only cookies work across all modern browsers
 *    - Cookies synced via Supabase across authenticated devices
 *    - Same session accessible from different devices (if using same auth)
 * 
 * 6. SECURITY MEASURES
 *    - Access tokens: Short-lived (1 hour default), stored in memory only
 *    - Refresh tokens: Longer-lived (7 days), stored in HTTP-only secure cookies
 *    - Session hijacking prevention: Token validation on every server request
 *    - CSRF protection: Supabase handles via PKCE flow
 */

export async function getCurrentUserProfile(): Promise<UserSession | null> {
  // Opt out of static caching so Next.js doesn't try to bake a stale auth result
  // into the build.  Pages that call this function via a shared layout (e.g.
  // not-found.tsx) must not crash during prerender — we return null (= "no user")
  // if cookies() throws DYNAMIC_SERVER_USAGE instead of letting it propagate.
  noStore()

  const demoUser = getDemoSession()
  if (demoUser) {
    return {
      session: { user: { id: demoUser.id, email: demoUser.email } },
      profile: {
        id: demoUser.id,
        email: demoUser.email,
        full_name: demoUser.full_name,
        role: demoUser.role,
        created_at: demoUser.created_at,
      },
    }
  }

  const supabase = createServerSupabaseClient()

  if (!supabase) {
    console.warn("[v0] Supabase not configured")
    return null
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("[v0] Session retrieval error:", sessionError)
      return null
    }

    if (!session) return null

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (profileError) {
      console.error("[v0] Profile retrieval error:", profileError)
      return { session, profile: null }
    }

    return { session, profile }
  } catch (error: any) {
    // During static prerender Next.js throws DYNAMIC_SERVER_USAGE when cookies()
    // is accessed.  Treat that as "no authenticated user" so the build succeeds.
    if (error?.digest === "DYNAMIC_SERVER_USAGE") return null
    console.error("[v0] Unexpected error in getCurrentUserProfile:", error)
    return null
  }
}

export async function getUserWorkspace(): Promise<"public" | "app" | "organizer" | "scanner"> {
  const demoUser = getDemoSession()
  if (demoUser) {
    if (demoUser.role === "organizer") return "organizer"
    if (demoUser.role === "staff") return "scanner"
    return "app"
  }

  const userProfile = await getCurrentUserProfile()

  if (!userProfile?.profile) return "public"

  const supabase = createServerSupabaseClient()
  if (!supabase) return "public"

  try {
    // Check if user is an organizer
    const { data: orgMember, error: orgError } = await supabase
      .from("org_members")
      .select("role, org_id")
      .eq("user_id", userProfile.session.user.id)
      .maybeSingle()

    if (orgError) {
      console.error("[v0] Error checking org membership:", orgError)
    }

    if (orgMember && (orgMember.role === "organizer" || orgMember.role === "admin")) {
      return "organizer"
    }

    // Check if user is staff/scanner
    if (userProfile.profile.role === "staff") {
      return "scanner"
    }

    // Default to attendee app
    return "app"
  } catch (error) {
    console.error("[v0] Unexpected error in getUserWorkspace:", error)
    return "public"
  }
}

/**
 * LOGOUT & SESSION INVALIDATION
 * 
 * When user logs out:
 * 1. Demo session is immediately cleared from memory
 * 2. Supabase auth.signOut() is called from client (removes all session cookies)
 * 3. Subsequent requests to protected routes will have no valid session
 * 4. User is redirected to login page
 * 5. Protected pages check for session and redirect if missing
 */
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  const demoUser = getDemoSession()
  if (demoUser) {
    clearDemoSession()
    console.log("[v0] Demo session cleared on logout")
    return { success: true }
  }

  console.warn("[v0] signOutUser called from server - should use client-side supabase.auth.signOut()")
  return { success: false, error: "Call supabase.auth.signOut() from client components" }
}

export async function isUserOrganizer(userId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()

  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from("org_members")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "organizer"])
      .maybeSingle()

    if (error) {
      console.error("[v0] Error checking organizer status:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("[v0] Unexpected error checking organizer status:", error)
    return false
  }
}

/**
 * Check if a user is a platform admin
 */
export async function isUserPlatformAdmin(userId: string): Promise<boolean> {
  return isUserAdmin(userId)
}
