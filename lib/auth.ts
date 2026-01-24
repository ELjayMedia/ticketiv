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

export async function getCurrentUserProfile(): Promise<UserSession | null> {
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
      .eq("id", session.user.id)
      .single()

    if (profileError) {
      console.error("[v0] Profile retrieval error:", profileError)
      return { session, profile: null }
    }

    return { session, profile }
  } catch (error) {
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

export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  const demoUser = getDemoSession()
  if (demoUser) {
    clearDemoSession()
    console.log("[v0] Demo session cleared")
    return { success: true }
  }

  // The actual sign out should happen in the client component using the browser client
  console.warn("[v0] signOutUser should be called from client components")
  return { success: false, error: "This function should be called from client side" }
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
