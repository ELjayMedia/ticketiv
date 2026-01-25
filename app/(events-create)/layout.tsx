import type React from "react"
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
  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    console.log("[v0] No session for event creation, redirecting to login")
    return redirect("/login")
  }

  console.log("[v0] Event creation layout access granted for user:", session.user.id)
  return <>{children}</>
}
