import { NextResponse, type NextRequest } from "next/server"

import { failedAuthLinkDestination } from "@/lib/auth/auth-link-errors"
import { linkNext, redirectWithError } from "@/lib/auth/email-link"
import { createClient } from "@/lib/supabase/server"

/**
 * PKCE return for OAuth and email links. The account's profile rows come from
 * the sign-up trigger, so this only exchanges the code and redirects.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const next = linkNext(request)

  if (!code) return redirectWithError(request, failedAuthLinkDestination(next, "missing_auth_code"))

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  // PKCE codes only exchange in the browser that requested them (e.g. a reset email opened on a phone fails).
  if (error) return redirectWithError(request, failedAuthLinkDestination(next, "auth_callback_failed"))

  return NextResponse.redirect(new URL(next, request.url))
}
