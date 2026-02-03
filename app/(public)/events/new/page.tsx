import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export const dynamic = "force-dynamic"

/**
 * /events/new - Redirect to organizer dashboard
 * Public visitors cannot create events, only authenticated organizers can.
 * This page intercepts the /events/new route before it matches /events/[id]
 */
export default async function PublicEventsNewPage() {
  const cookieStore = await cookies()
  const demoSession = cookieStore.get("demo_session")

  if (demoSession) {
    try {
      const user = JSON.parse(demoSession.value)
      // For demo users, redirect to their default org dashboard
      redirect(`/orgs/demo-org-1/events/new`)
    } catch (error) {
      console.error("[v0] Failed to parse demo session:", error)
    }
  }

  // Not authenticated, redirect to login
  redirect("/login")
}
