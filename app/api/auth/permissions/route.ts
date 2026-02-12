import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { loadUserPermissions } from "@/lib/permissions-loader"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"

export const dynamic = "force-dynamic"

/**
 * GET /api/auth/permissions
 * Returns the current user's permissions and org memberships
 */
export async function GET(request: Request) {
  try {
    // Check demo session first (server-side)
    const demoUser = await getDemoSessionFromCookie()
    if (demoUser) {
      const authz = await loadUserPermissions(demoUser.id)
      if (authz) {
        return NextResponse.json(authz, { status: 200 })
      }
    }

    // Get session from Supabase
    const supabase = createServerSupabaseClient()
    if (!supabase) {
      // When Supabase is not configured, return 401 to indicate no authentication available
      console.warn("[v0] Supabase not configured, cannot load permissions")
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    const authz = await loadUserPermissions(session.user.id)

    if (!authz) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    return NextResponse.json(authz, { status: 200 })
  } catch (error) {
    console.error("[v0] Permissions endpoint error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
