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
 *   If env vars are missing or any DB call throws, we pass through rather than 500
 *   so the rest of the app remains accessible. Auth errors are logged.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname

  // Allow static assets, Next internals, and the sign-out API
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api/sign-out") ||
    path.includes(".")
  ) {
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

    // Public browsing routes — accessible without auth
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

    // Helper: check whether the user has a handle (lazy — only when needed)
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

    if (isPublicBrowsing || isRootOrEvent) {
      // Authed user landing on sign-in/verify/signup/login → push them forward
      if (
        user &&
        (path.startsWith("/sign-in") ||
          path.startsWith("/login") ||
          path.startsWith("/signup") ||
          path.startsWith("/verify"))
      ) {
        const target = (await hasHandle()) ? "/" : "/onboarding"
        return NextResponse.redirect(new URL(target, request.url))
      }
      return response
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
