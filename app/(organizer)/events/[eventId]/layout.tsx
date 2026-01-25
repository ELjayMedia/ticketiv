import React from "react"
import { redirect, notFound } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoEventById } from "@/lib/demo-data"
import { getDemoSession } from "@/lib/demo-auth"
import { cookies } from "next/headers"

/**
 * Layout for event management pages
 * Enforces event-level access control:
 * - User must be event_staff for eventId OR
 * - User must be org admin/organizer for the event's org
 */
export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { eventId: string }
}) {
  const eventId = params.eventId
  const cookieStore = await cookies()
  const demoSessionCookie = cookieStore.get("demo_session")

  // Demo mode check
  if (demoSessionCookie) {
    try {
      const demoUser = JSON.parse(demoSessionCookie.value)
      const event = getDemoEventById(eventId)

      if (!event) notFound()

      // In demo: only demo organizers can access their events
      if (demoUser.role !== "organizer") {
        return redirect("/403")
      }

      return <>{children}</>
    } catch (error) {
      console.error("[v0] Demo mode error:", error)
      return redirect("/login")
    }
  }

  // Production: check real permissions
  const supabase = createServerSupabaseClient()
  if (!supabase) return redirect("/login")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return redirect("/login")

  const userId = session.user.id

  // Fetch event to get org_id
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, org_id, title")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError || !event) {
    console.error("[v0] Error fetching event:", eventError)
    return notFound()
  }

  // Check if user is event staff
  const { data: eventStaff } = await supabase
    .from("event_staff")
    .select("user_id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (eventStaff) {
    console.log("[v0] Event access granted via event_staff:", userId, eventId)
    return <>{children}</>
  }

  // Check if user is org admin/organizer
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", event.org_id)
    .in("role", ["admin", "organizer"])
    .maybeSingle()

  if (orgMember) {
    console.log("[v0] Event access granted via org admin:", userId, eventId, event.org_id)
    return <>{children}</>
  }

  console.warn("[v0] Unauthorized event access:", userId, eventId)
  return redirect("/403")
}
