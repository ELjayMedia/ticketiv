import { type EmailOtpType } from "@supabase/supabase-js"
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
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null
  const next = getSafeNext(request)
  const redirectTo = request.nextUrl.clone()

  redirectTo.pathname = next
  redirectTo.search = ""

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (!error) {
      try {
        await bootstrapTicketivProfile()
      } catch {
        redirectTo.pathname = "/login"
        redirectTo.searchParams.set("error", "profile_bootstrap_failed")
        return NextResponse.redirect(redirectTo)
      }

      return NextResponse.redirect(redirectTo)
    }
  }

  redirectTo.pathname = "/login"
  redirectTo.searchParams.set("error", "email_confirmation_failed")
  return NextResponse.redirect(redirectTo)
}
