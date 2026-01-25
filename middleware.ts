import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSession } from "@/lib/demo-auth"

/**
 * Middleware for RBAC route protection
 * Protects routes based on user permissions from org_members, event_staff, and admin_users
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes - no protection needed
  const publicRoutes = ["/", "/login", "/register", "/auth/verify-email"]
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
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Admin routes: /admin/* → requires isGlobalAdmin
  if (pathname.startsWith("/admin")) {
    const isAdmin = demoUser?.role === "admin" || (await checkGlobalAdmin(userId))
    if (!isAdmin) {
      console.warn(`[v0] Unauthorized admin access attempt by ${userId}`)
      return NextResponse.redirect(new URL("/403", request.url))
    }
  }

  // Org routes: /orgs/:orgId/* → requires org membership
  const orgMatch = pathname.match(/^\/orgs\/([^/]+)/)
  if (orgMatch) {
    const orgId = orgMatch[1]
    const hasAccess = demoUser?.org_id === orgId || (await checkOrgMembership(userId, orgId))
    if (!hasAccess) {
      console.warn(`[v0] Unauthorized org access: ${userId} -> ${orgId}`)
      return NextResponse.redirect(new URL("/403", request.url))
    }
  }

  // Event staff routes: /events/:eventId/manage/* → requires event_staff or org admin
  const eventMatch = pathname.match(/^\/events\/([^/]+)\/manage/)
  if (eventMatch) {
    const eventId = eventMatch[1]
    const hasAccess = await checkEventStaffAccess(userId, eventId)
    if (!hasAccess) {
      console.warn(`[v0] Unauthorized event access: ${userId} -> ${eventId}`)
      return NextResponse.redirect(new URL("/403", request.url))
    }
  }

  return NextResponse.next()
}

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

async function checkEventStaffAccess(userId: string, eventId: string): Promise<boolean> {
  try {
    const supabase = createServerSupabaseClient()
    if (!supabase) return false

    // Check if user is event staff
    const { data: eventStaff } = await supabase
      .from("event_staff")
      .select("event_id")
      .eq("user_id", userId)
      .eq("event_id", eventId)
      .maybeSingle()

    if (eventStaff) return true

    // Check if user is org admin for the event's org
    const { data: event } = await supabase
      .from("events")
      .select("org_id")
      .eq("id", eventId)
      .maybeSingle()

    if (event) {
      const { data: orgMember } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", userId)
        .eq("org_id", event.org_id)
        .in("role", ["admin", "organizer"])
        .maybeSingle()

      return !!orgMember
    }

    return false
  } catch (error) {
    console.error("[v0] Error checking event staff access:", error)
    return false
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
