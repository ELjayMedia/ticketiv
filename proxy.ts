import { NextResponse, type NextRequest } from "next/server"

import { organizerHostRedirect } from "@/lib/organizer/host"
import { getTicketivCanonicalRedirect } from "@/lib/public-url"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  const canonicalUrl = getTicketivCanonicalRedirect(request.url)
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 308)

  // organizer.ticketiv.app (ADR 0002); a no-op until NEXT_PUBLIC_ORGANIZER_HOST is set.
  // Temporary redirects, so turning the subdomain off again is instant.
  const hostUrl = organizerHostRedirect(requestUrlWithHost(request))
  if (hostUrl) return NextResponse.redirect(hostUrl, 307)

  return updateSession(request)
}

/** The request URL with the host the browser asked for (Host / X-Forwarded-Host). */
function requestUrlWithHost(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host")
  if (!host) return request.url
  const url = new URL(request.url)
  url.host = host.split(",")[0].trim()
  return url.toString()
}

export const config = {
  // Health endpoints must be reachable by uptime monitors without an auth
  // session, so they are excluded from the matcher.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|.*\\..*).*)"],
}
