import type React from "react"
import { unstable_noStore as noStore } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSession } from "@/lib/demo-auth"

/**
 * Public events creation layout
 * No org membership required - anyone authenticated can create events
 */
export default async function EventsCreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is authenticated (demo or real)
  const demoUser = getDemoSession()

  if (demoUser) {
    console.log("[v0] Demo user creating event:", demoUser.email)
    return <>{children}</>
  }

  // Production: require authentication only
  // noStore() prevents Next.js from trying to statically render this layout;
  // getSession() calls cookies() which throws DYNAMIC_SERVER_USAGE if it runs
  // during build, so we catch that and redirect to login gracefully.
  noStore()

  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return redirect("/login")
  }

  let session: any = null
  try {
    const { data } = await supabase.auth.getSession()
    session = data.session
  } catch (error: any) {
    if (error?.digest !== "DYNAMIC_SERVER_USAGE") {
      console.error("[v0] Event creation layout session error:", error)
    }
    return redirect("/login")
  }

  if (!session) {
    console.log("[v0] No session for event creation, redirecting to login")
    return redirect("/login")
  }

  console.log("[v0] Event creation layout access granted for user:", session.user.id)
  return <>{children}</>
}
