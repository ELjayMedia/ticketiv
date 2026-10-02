import { type EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

import { failedAuthLinkDestination, isRecoveryDestination } from "@/lib/auth/auth-link-errors"
import { createClient } from "@/lib/supabase/server"

function getSafeNext(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") || request.nextUrl.searchParams.get("redirectTo") || "/"
  return next.startsWith("/") && !next.startsWith("//") ? next : "/"
}

async function bootstrapTicketivProfile() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error(userError?.message || "Unable to load verified user")
  }

  const { error } = await supabase.rpc("fn_bootstrap_ticketiv_user", {
    p_user_id: user.id,
    p_email: user.email ?? undefined,
    p_phone: undefined,
    p_display_name: user.user_metadata?.display_name ?? undefined,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const code = request.nextUrl.searchParams.get("code")
  const next = getSafeNext(request)
  const redirectTo = request.nextUrl.clone()

  redirectTo.pathname = next
  redirectTo.search = ""

  const fail = () => {
    const destination = failedAuthLinkDestination(next, "email_confirmation_failed")
    redirectTo.pathname = destination.pathname
    redirectTo.search = ""
    redirectTo.searchParams.set("error", destination.error)
    return NextResponse.redirect(redirectTo)
  }

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

  if (!verified) {
    return fail()
  }

  try {
    await bootstrapTicketivProfile()
  } catch {
    // A password reset must not be blocked by profile bootstrap; the reset page only needs the session.
    if (!isRecoveryDestination(next)) {
      redirectTo.pathname = "/login"
      redirectTo.searchParams.set("error", "profile_bootstrap_failed")
      return NextResponse.redirect(redirectTo)
    }
  }

  return NextResponse.redirect(redirectTo)
}
