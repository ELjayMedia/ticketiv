import { NextResponse, type NextRequest } from "next/server"

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

  if (!code) {
    redirectTo.pathname = "/login"
    redirectTo.searchParams.set("error", "missing_auth_code")
    return NextResponse.redirect(redirectTo)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    redirectTo.pathname = "/login"
    redirectTo.searchParams.set("error", "auth_callback_failed")
    return NextResponse.redirect(redirectTo)
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
