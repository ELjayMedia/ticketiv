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
 * Protected (auth required, optionally + handle):
 *   /orgs/*, /app/*, /events/create, /scan/*, /admin/*, /dashboard,
 *   /payouts, /finance, /profile, /payments, /checkout/*, /orders/*, /tickets/*, /devices
 *
 * Safety:
 *   Public routes are returned before any Supabase call. This prevents a slow or
 *   unavailable auth service from taking down the public marketplace with a
 *   Vercel function timeout.
 *
 *   If env vars are missing or any DB call throws on protected routes, we pass
 *   through rather than 500 so the rest of the app remains accessible. Auth
 *   errors are logged.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname

  // Allow static assets, Next internals, the sign-out API, and the unauthenticated
  // health endpoints used by Vercel/uptime monitoring.
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api/sign-out") ||
    path === "/api/health" ||
    path.startsWith("/api/health/") ||
    path.includes(".")
  ) {
    return response
  }

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

  // Public browsing routes must never wait on Supabase auth. The page/API code
  // can still load public data, but the middleware should not block rendering.
  if (isPublicBrowsing || isRootOrEvent) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // No Supabase configured → let everything through. Pages will handle their own
  // unauthenticated states. This avoids a 500 wall when env is missing.
  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
    })

    // IMPORTANT: do not run code between createServerClient() and getUser().
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Authed user landing on onboarding should be moved forward only after auth.
    async function hasHandle(): Promise<boolean> {
      if (!user) return false
      try {
        const { data } = await supabase
          .from("user_handles")
          .select("handle")
          .eq("user_id", user.id)
          .maybeSingle()
        return !!data
      } catch {
        return false
      }
    }

    // /onboarding — requires session, allowed without handle
    if (path.startsWith("/onboarding")) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = "/login"
        url.searchParams.set("from", path)
        return NextResponse.redirect(url)
      }
      if (await hasHandle()) {
        return NextResponse.redirect(new URL("/", request.url))
      }
      return response
    }

    // All other routes require auth
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      url.searchParams.set("from", path)
      return NextResponse.redirect(url)
    }

    // Handle gate for app/profile/payment/order/ticket routes
    const requiresHandle = ["/app/", "/profile", "/payments", "/checkout/", "/orders/", "/tickets/"]
    if (requiresHandle.some((p) => path.startsWith(p))) {
      if (!(await hasHandle())) {
        return NextResponse.redirect(new URL("/onboarding", request.url))
      }
    }

    // Admin routes
    if (path.startsWith("/admin")) {
      try {
        const { data: adminRow } = await supabase
          .from("admin_users")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle()
        if (!adminRow) {
          return NextResponse.redirect(new URL("/403", request.url))
        }
      } catch {
        return NextResponse.redirect(new URL("/403", request.url))
      }
      return response
    }

    // Org routes: /orgs/:orgId/* — requires org membership
    const orgMatch = path.match(/^\/orgs\/([^/]+)/)
    if (orgMatch) {
      const orgId = orgMatch[1]
      try {
        const { data: memberRow } = await supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("org_id", orgId)
          .maybeSingle()
        if (!memberRow) {
          return NextResponse.redirect(new URL("/403", request.url))
        }
      } catch {
        return NextResponse.redirect(new URL("/403", request.url))
      }
      return response
    }

    return response
  } catch (err) {
    // Any unexpected failure: pass through rather than 500 the entire app.
    console.error("[middleware] error:", err)
    return response
  }
}
