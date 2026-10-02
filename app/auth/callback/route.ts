import { NextResponse, type NextRequest } from "next/server"

import { failedAuthLinkDestination } from "@/lib/auth/auth-link-errors"
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
  const code = request.nextUrl.searchParams.get("code")
  const next = getSafeNext(request)
  const redirectTo = request.nextUrl.clone()

  redirectTo.pathname = next
  redirectTo.search = ""

  const fail = (fallback: "missing_auth_code" | "auth_callback_failed") => {
    const destination = failedAuthLinkDestination(next, fallback)
    redirectTo.pathname = destination.pathname
    redirectTo.search = ""
    redirectTo.searchParams.set("error", destination.error)
    return NextResponse.redirect(redirectTo)
  }

  if (!code) {
    return fail("missing_auth_code")
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // PKCE codes only exchange in the browser that requested them (e.g. a reset email opened on a phone fails).
    return fail("auth_callback_failed")
  }

  try {
    await bootstrapTicketivProfile()
  } catch {
    redirectTo.pathname = "/login"
    redirectTo.searchParams.set("error", "profile_bootstrap_failed")
    return NextResponse.redirect(redirectTo)
  }

  return NextResponse.redirect(redirectTo)
}
