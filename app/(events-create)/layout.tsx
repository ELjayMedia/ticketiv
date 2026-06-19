import type React from "react"
import { unstable_noStore as noStore } from "next/cache"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Public events creation layout
 * No org membership required - anyone authenticated can create events
 */
export default async function EventsCreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
