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
      console.error("[v0] Supabase not configured for auth callback")
      return NextResponse.redirect(`${requestUrl.origin}/login`)
    }

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error("[v0] Code exchange error:", exchangeError)
        return NextResponse.redirect(`${requestUrl.origin}/auth/verify-email?error=expired`)
      }

      console.log("[v0] Session exchanged successfully via auth callback")

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (session?.user) {
        console.log("[v0] User authenticated:", session.user.id)
        
        const { data: orgMember } = await supabase
          .from("org_members")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle()

        if (orgMember?.role === "admin" || orgMember?.role === "organizer") {
          console.log("[v0] Redirecting to organizer dashboard")
          return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
        }
      }

      console.log("[v0] Redirecting to home")
      return NextResponse.redirect(`${requestUrl.origin}/`)
    } catch (error) {
      console.error("[v0] Unexpected error in auth callback:", error)
      return NextResponse.redirect(`${requestUrl.origin}/login?error=callback_failed`)
    }
  }

  console.warn("[v0] Auth callback received without code or error")
  return NextResponse.redirect(`${requestUrl.origin}/login`)
}
