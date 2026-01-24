import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const error = requestUrl.searchParams.get("error")
  const errorDescription = requestUrl.searchParams.get("error_description")

  if (error) {
    console.error("[v0] Auth callback error:", error, errorDescription)
    return NextResponse.redirect(
      `${requestUrl.origin}/auth/verify-email?error=${encodeURIComponent(errorDescription || error)}`,
    )
  }

  if (code) {
    const supabase = createServerSupabaseClient()

    if (!supabase) {
      return NextResponse.redirect(`${requestUrl.origin}/login`)
    }

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error("[v0] Code exchange error:", exchangeError)
      return NextResponse.redirect(`${requestUrl.origin}/auth/verify-email?error=expired`)
    }

    // Check user's org membership to determine redirect
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: orgMember } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle()

      if (orgMember?.role === "admin" || orgMember?.role === "organizer") {
        return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
      }
    }

    return NextResponse.redirect(`${requestUrl.origin}/`)
  }

  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
