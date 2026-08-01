import { NextResponse, type NextRequest } from "next/server"

import { getTicketivCanonicalRedirect } from "@/lib/public-url"
import { updateSession } from "@/lib/supabase/middleware"

export async function proxy(request: NextRequest) {
  const canonicalUrl = getTicketivCanonicalRedirect(request.url)
  if (canonicalUrl) return NextResponse.redirect(canonicalUrl, 308)

  return updateSession(request)
}

export const config = {
  // Health endpoints must be reachable by uptime monitors without an auth
  // session, so they are excluded from the matcher.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health|.*\\..*).*)"],
}
