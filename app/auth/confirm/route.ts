import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { failedAuthLinkDestination } from "@/lib/auth/auth-link-errors"
import { linkNext, redirectWithError } from "@/lib/auth/email-link"
import { createClient } from "@/lib/supabase/server"

/**
 * Email confirmation and password-recovery links. The account's profile rows
 * come from the sign-up trigger, so this only verifies the link and redirects.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const tokenHash = params.get("token_hash")
  const type = params.get("type") as EmailOtpType | null
  const code = params.get("code")
  const next = linkNext(request)

  const supabase = await createClient()
  let verified = false

  if (tokenHash && type) {
    // token_hash links are verified server-side, so they work on any device or browser.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    verified = !error
  } else if (code) {
    // Fallback for PKCE links (default email template): only works in the browser that requested them.
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    verified = !error
  }

  if (!verified) return redirectWithError(request, failedAuthLinkDestination(next, "email_confirmation_failed"))

  return NextResponse.redirect(new URL(next, request.url))
}
