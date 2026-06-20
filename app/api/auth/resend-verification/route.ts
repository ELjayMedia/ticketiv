import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    const rl = await rateLimit("auth:resend-verification", clientKey(request), 5, 300)
    if (!rl.allowed) return tooManyRequests(rl)

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createServerSupabaseClient()

    if (!supabase) {
      return NextResponse.json({ error: "Authentication service not available" }, { status: 503 })
    }

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.includes("rate limit")) {
        return NextResponse.json({ error: "Too many requests. Please wait before trying again." }, { status: 429 })
      }

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: "Verification email sent" })
  } catch (error: any) {
    console.error("[v0] Resend verification error:", error)
    return NextResponse.json({ error: error.message || "Failed to resend verification email" }, { status: 500 })
  }
}
