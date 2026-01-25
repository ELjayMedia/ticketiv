import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSession } from "@/lib/demo-auth"

/**
 * RBAC Middleware - Coarse-grained route protection
 *
 * Strategy (Option A):
 * ✓ Only does fast, coarse checks that don't require cross-table lookups
 * ✓ Authenticated check for protected routes
 * ✓ Org membership for org-scoped routes (fast: org_members table only)
 * ✓ "Authenticated" check only for event routes - detailed access (event_staff + org admin) enforced in layout
 *
 * Why:
 * - Event → Org mapping requires fetching event row, risking divergence from real permissions
 * - Layouts are where entity context is available and can use full permissions loader
 * - Middleware is fast path; detailed checks belong in app logic
 */

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log("[v0] Middleware check:", pathname)

  // Public routes - no protection needed
  const publicRoutes = ["/", "/login", "/register", "/auth/verify-email", "/403"]
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Check authentication
  const demoUser = getDemoSession()
  let userId: string | null = null

  if (demoUser) {
    userId = demoUser.id
  } else {
    const supabase = createServerSupabaseClient()
    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      userId = session?.user?.id || null
    }
  }

  // Redirect to login if not authenticated
  if (!userId) {
    console.log("[v0] Unauthenticated access attempt to protected route:", pathname)
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Admin routes: /admin/* → requires isGlobalAdmin
  if (pathname.startsWith("/admin")) {
    const isAdmin = demoUser?.role === "admin" || (await checkGlobalAdmin(userId))
    if (!isAdmin) {
      console.warn(`[v0] Unauthorized admin access attempt by ${userId}`)
      return NextResponse.redirect(new URL("/403", request.url))
    }
    return NextResponse.next()
  }

  // Org routes: /orgs/:orgId/* → requires org membership (fast check)
  const orgMatch = pathname.match(/^\/orgs\/([^/]+)/)
  if (orgMatch) {
    const orgId = orgMatch[1]
    const hasAccess = demoUser?.org_id === orgId || (await checkOrgMembership(userId, orgId))
    if (!hasAccess) {
      console.warn(`[v0] Unauthorized org access: ${userId} -> ${orgId}`)
      return NextResponse.redirect(new URL("/403", request.url))
    }
    return NextResponse.next()
  }

  // Organizer routes: /organizer/* → requires ANY org membership
  // (specific org/event checks happen in layout/page)
  if (pathname.startsWith("/organizer")) {
    const hasAnyOrgAccess = await checkAnyOrgMembership(userId)
    if (!hasAnyOrgAccess) {
      console.warn(`[v0] Unauthorized organizer access: ${userId} (not in any org)`)
      return NextResponse.redirect(new URL("/403", request.url))
    }
    return NextResponse.next()
  }

  // All other protected routes just require authentication
  // Detailed permission checks (event access, etc.) happen in layouts/pages
  return NextResponse.next()
}

/**
 * Checks if user exists in admin_users table
 */
async function checkGlobalAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) return false

    const { data } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    return !!data
  } catch (error) {
    console.error("[v0] Error checking global admin:", error)
    return false
  }
}

/**
 * Fast check: user is a member of the specific org
 */
async function checkOrgMembership(userId: string, orgId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) return false

    const { data } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .maybeSingle()

    return !!data
  } catch (error) {
    console.error("[v0] Error checking org membership:", error)
    return false
  }
}

/**
 * Fast check: user is a member of ANY org
 * Used for /organizer/* routes
 */
async function checkAnyOrgMembership(userId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) return false

    const { data } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", userId)
      .limit(1)

    return data && data.length > 0
  } catch (error) {
    console.error("[v0] Error checking any org membership:", error)
    return false
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
