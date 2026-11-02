import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { resolveSupabasePublicKey } from "@/lib/env-public"
import { authCookieOptions } from "@/lib/organizer/host"
import {
  isExpectedSignedOutAuthError,
  isStaleSupabaseRefreshTokenError,
  isSupabaseAuthTokenCookie,
} from "@/lib/supabase/auth-errors"

const DEVICE_AUTHENTICATED_SCANNER_APIS = new Set([
  "/api/scanner/manifest",
  "/api/scanner/scans",
  "/api/scanner/session",
  "/api/scanner/sync",
  "/api/scanner/validate",
])

function redirectToLogin(request: NextRequest, from: string) {
  const url = request.nextUrl.clone()
  if (from === "/super-admin" || from.startsWith("/super-admin/")) {
    url.pathname = "/super-admin/login"
    url.search = ""
  } else {
    url.pathname = "/login"
    url.searchParams.set("from", from)
  }
  return NextResponse.redirect(url)
}

function clearSupabaseAuthTokenCookies(request: NextRequest, response: NextResponse) {
  for (const { name } of request.cookies.getAll()) {
    if (isSupabaseAuthTokenCookie(name)) {
      const shared = authCookieOptions()
      // A cookie set on the shared domain (.ticketiv.app) only clears with that domain.
      if (shared) response.cookies.set(name, "", { ...shared, path: "/", maxAge: 0 })
      else response.cookies.delete(name)
    }
  }
}

function recoverSignedOutSession(request: NextRequest, path: string, error: unknown) {
  const redirect = redirectToLogin(request, path)
  if (isStaleSupabaseRefreshTokenError(error)) {
    clearSupabaseAuthTokenCookies(request, redirect)
  }
  return redirect
}

/**
 * Refreshes the Supabase session and enforces auth gates.
 *
 * Public routes (no auth needed):
 *   /, /browse, /events/[id], /artists, /categories, /category/*, /organisers,
 *   /host, /marketplace, /privacy, /terms, /refund-policy, /data-deletion,
 *   /support, /help, /sign-in, /login, /verify, /signup, /organizer/register,
 *   /forgot-password, /reset-password, /verify-email, /auth/*, /403, /maintenance
 *
 * Public APIs with their own verification:
 *   /api/discover/*, /api/search/suggest, /api/mobile/tickets/*, /api/mobile/organizer/*,
 *   selected /api/scanner/* device endpoints,
 *   /api/payouts, /api/payments/paystack/webhook, /api/payments/momo/callback
 *
 * Onboarding gate:
 *   /onboarding — requires session, allowed without a handle
 *
 * Protected (auth required, optionally + handle):
 *   /orgs/*, /app/*, /admin/*,
 *   /profile, /payments, /checkout/*, /orders/*, /tickets/*
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

  // Allow static assets, Next internals, the sign-out API, unauthenticated
  // health endpoints, and endpoints that perform their own authentication.
  // Scanner device APIs must reach their route handlers even after the browser
  // user signs out: those handlers verify the provisioned device session.
  if (
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api/sign-out") ||
    DEVICE_AUTHENTICATED_SCANNER_APIS.has(path) ||
    path === "/api/health" ||
    path.startsWith("/api/health/") ||
    path.startsWith("/api/cron/") ||
    path.startsWith("/api/discover/") ||
    path === "/api/search/suggest" ||
    path.startsWith("/api/mobile/tickets/") ||
    // Ticketiv Organizer app: bearer-token auth, verified in the route handlers.
    path.startsWith("/api/mobile/organizer/") ||
    path === "/api/payouts" ||
    path === "/api/payments/paystack/webhook" ||
    path === "/api/payments/momo/callback" ||
    path.includes(".")
  ) {
    return response
  }

  const publicPrefixes = [
    "/sign-in",
    "/login",
    "/signup",
    "/organizer/register",
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
    "/search",
    "/series",
    "/host",
    "/marketplace",
    "/privacy",
    "/terms",
    "/refund-policy",
    "/data-deletion",
    "/support",
    "/help",
  ]
  const isPublicBrowsing =
    path === "/super-admin/login" || publicPrefixes.some((p) => path.startsWith(p))
  const isRootOrEvent =
    path === "/" ||
    path.startsWith("/events")

  // Public browsing routes must never wait on Supabase auth. The page/API code
  // can still load public data, but the middleware should not block rendering.
  if (isPublicBrowsing || isRootOrEvent) {
    return response
  }

  // Scanner shells can be opened by dedicated devices provisioned with setup
  // codes. The scanner API routes enforce either a user session or an active
  // device_session before returning event/scanning data.
  if (path === "/scan" || path.startsWith("/scan/")) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = resolveSupabasePublicKey(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )

  // No Supabase configured → let everything through. Pages will handle their own
  // unauthenticated states. This avoids a 500 wall when env is missing.
  if (!supabaseUrl || !supabaseKey) {
    return response
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookieOptions: authCookieOptions(),
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
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      if (isExpectedSignedOutAuthError(userError)) {
        return recoverSignedOutSession(request, path, userError)
      }
      throw userError
    }

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
        return redirectToLogin(request, path)
      }
      if (await hasHandle()) {
        return NextResponse.redirect(new URL("/", request.url))
      }
      return response
    }

    // All other routes require auth
    if (!user) {
      return redirectToLogin(request, path)
    }

    // Handle gate for app/profile/payment/order/ticket routes. Buyer-owned
    // order and ticket pages are exempt: guest (anonymous) buyers never have a
    // handle, and paying (MoMo approval), confirming, refunding or opening a
    // ticket must not detour through onboarding. RLS still scopes the reads to
    // the buyer. Resale and transfer stay gated — they are account features.
    const requiresHandle = ["/app/", "/profile", "/payments", "/checkout/", "/orders/", "/tickets/"]
    const isBuyerOwnedPage =
      /^\/orders\/[^/]+(\/(confirmation|momo|refund))?$/.test(path) ||
      /^\/tickets\/[^/]+$/.test(path)
    if (!isBuyerOwnedPage && requiresHandle.some((p) => path.startsWith(p))) {
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

    // Org routes: /orgs/:orgId/* only need a signed-in user here. Who may
    // enter is decided by the org layout (getOrganizerAccess): org members,
    // platform admins, and people assigned to one of the org's events — the
    // last are invisible to this RLS-scoped client (event_staff is hidden from
    // authenticated reads), so a membership check here would turn away door
    // staff. Data stays protected by RLS either way.
    if (/^\/orgs\/[^/]+/.test(path)) {
      return response
    }

    return response
  } catch (err) {
    if (isExpectedSignedOutAuthError(err)) {
      return recoverSignedOutSession(request, path, err)
    }

    // Any unexpected failure: pass through rather than 500 the entire app.
    console.error("[middleware] error:", err)
    return response
  }
}