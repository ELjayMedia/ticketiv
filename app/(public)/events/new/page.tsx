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
      console.log("[v0] Redirecting demo user to organizer dashboard:", user.email)
      redirect(`/orgs/demo-org-1/events/new`)
    } catch (error) {
      // Ignore redirect errors - they're expected for Next.js routing
      if (error instanceof Error && error.message.includes("Redirect")) {
        throw error
      }
      console.error("[v0] Failed to parse demo session:", error)
    }
  }

  // Not authenticated, redirect to login
  redirect("/login")
}
