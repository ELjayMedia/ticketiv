import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/**
 * Refreshes the Supabase session and enforces auth gates.
 *
 * Public routes (no auth needed):
 *   /, /browse, /events/[id], /artists, /categories, /category/*, /organisers,
 *   /host, /marketplace, /sign-in, /login, /verify, /signup, /forgot-password,
 *   /reset-password, /verify-email, /auth/*, /403, /maintenance
 *
 * Onboarding gate:
 *   /onboarding — requires session, allowed without a handle
 *
 * Protected (auth + handle required):
 *   /orgs/*, /app/*, /events/create, /scan/*, /admin/*, /dashboard,
 *   /payouts, /finance, /profile, /payments, /checkout/*, /orders/*, /tickets/*, /devices
 *
 * Org membership check (fast, no cross-table join):
 *   /orgs/:orgId/* — user must be in org_members for that orgId
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // IMPORTANT: do not run code between createServerClient() and getUser().
  // getUser() is the secure way to get the current user — getSession() is deprecated.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Allow static assets and Next internals
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.includes(".")
  ) {
    return response
  }

  // Allow sign-out API
  if (path.startsWith("/api/sign-out")) return response

  // Public browsing routes — accessible without any auth
  const publicPrefixes = [
    "/sign-in",
    "/login",
    "/signup",
    "/verify",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/auth/",
    "/403",
    "/maintenance",
    "/browse",
    "/artists",
    "/categories",
    "/category/",
    "/organisers",
    "/host",
    "/marketplace",
  ]
  const isPublicBrowsing = publicPrefixes.some((p) => path.startsWith(p))
  const isRootOrEvent =
    path === "/" ||
    (path.startsWith("/events") && !path.startsWith("/events/create"))

  if (isPublicBrowsing || isRootOrEvent) {
    // If authed + has handle: bounce away from sign-in/login/signup/verify
    if (
      user &&
      (path.startsWith("/sign-in") ||
        path.startsWith("/login") ||
        path.startsWith("/signup") ||
        path.startsWith("/verify"))
    ) {
      const { data: handleRow } = await supabase
        .from("user_handles")
        .select("handle")
        .eq("user_id", user.id)
        .maybeSingle()
      if (handleRow) {
        return NextResponse.redirect(new URL("/", request.url))
      }
      // Has session but no handle → let them go through onboarding
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
    return response
  }

  // Onboarding — requires session, allowed without handle
  if (path.startsWith("/onboarding")) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/sign-in"
      url.searchParams.set("from", path)
      return NextResponse.redirect(url)
    }
    const { data: handleRow } = await supabase
      .from("user_handles")
      .select("handle")
      .eq("user_id", user.id)
      .maybeSingle()
    if (handleRow) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return response
  }

  // All other routes require auth
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = "/sign-in"
    url.searchParams.set("from", path)
    return NextResponse.redirect(url)
  }

  // Check handle gate for app routes (not org routes — those have their own layouts)
  const requiresHandle = ["/app/", "/profile", "/payments", "/checkout/", "/orders/", "/tickets/"]
  if (requiresHandle.some((p) => path.startsWith(p))) {
    const { data: handleRow } = await supabase
      .from("user_handles")
      .select("handle")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!handleRow) {
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
  }

  // Admin routes: requires global admin
  if (path.startsWith("/admin")) {
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
    if (!adminRow) {
      return NextResponse.redirect(new URL("/403", request.url))
    }
    return response
  }

  // Org routes: /orgs/:orgId/* — requires org membership
  const orgMatch = path.match(/^\/orgs\/([^/]+)/)
  if (orgMatch) {
    const orgId = orgMatch[1]
    const { data: memberRow } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .eq("org_id", orgId)
      .maybeSingle()
    if (!memberRow) {
      return NextResponse.redirect(new URL("/403", request.url))
    }
    return response
  }

  return response
}
