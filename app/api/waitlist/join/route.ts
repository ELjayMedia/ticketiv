import { NextResponse } from "next/server"
import { joinWaitlist } from "@/lib/waitlist"
import { isFeatureEnabled } from "@/lib/feature-flags"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    // TICK-346 — waitlist_enabled is off. 404 rather than 403: a feature that
    // is not part of the launch should look absent, not merely switched off.
    if (!(await isFeatureEnabled("waitlist_enabled"))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const rl = await rateLimit("waitlist:join", clientKey(request), 10, 60)
    if (!rl.allowed) return tooManyRequests(rl)

    const formData = await request.formData()
    const eventId = formData.get("eventId") as string
    const firstName = formData.get("firstName") as string
    const lastName = formData.get("lastName") as string
    const email = formData.get("email") as string
    const quantity = Number.parseInt(formData.get("quantity") as string)

    if (!eventId || !email || !quantity) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user ID if logged in
    const supabase = createServerSupabaseClient()
    let userId: string | undefined

    if (supabase) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      userId = session?.user?.id
    }

    const result = await joinWaitlist({
      eventId,
      email,
      firstName,
      lastName,
      quantity,
      userId,
    })

    if (!result.success) {
      return NextResponse.redirect(
        new URL(
          `/events/${eventId}?error=${encodeURIComponent(result.error || "Failed to join waitlist")}`,
          request.url,
        ),
      )
    }

    return NextResponse.redirect(new URL(`/events/${eventId}?success=joined_waitlist`, request.url))
  } catch (error) {
    console.error("[v0] Waitlist join error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
