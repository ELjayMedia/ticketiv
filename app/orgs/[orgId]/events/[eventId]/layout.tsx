import type React from "react"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSession } from "@/lib/demo-auth"
import { getDemoEventById } from "@/lib/demo-data"

/**
 * Event edit layout
 * Enforces that user has edit access to the event
 * Requires event_staff role OR org admin status
 */
export default async function EventEditLayout({
  params,
  children,
}: {
  params: { orgId: string; eventId: string }
  children: React.ReactNode
}) {
  const { orgId, eventId } = params

  const demoUser = getDemoSession()
  if (demoUser) {
    if (demoUser.role !== "organizer" && demoUser.role !== "staff") {
      return redirect("/403")
    }
    console.log("[v0] Demo user event edit access granted:", eventId)
    return <>{children}</>
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) {
    return redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return redirect("/login")
  }

  const userId = session.user.id

  // Check if user is org admin
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .maybeSingle()

  const isOrgAdmin = orgMember?.role === "admin" || orgMember?.role === "organizer"

  // If org admin, allow access
  if (isOrgAdmin) {
    console.log("[v0] Org admin event edit access granted:", eventId)
    return <>{children}</>
  }

  // Otherwise check event_staff
  const { data: eventStaff } = await supabase
    .from("event_staff")
    .select("role")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle()

  if (!eventStaff) {
    console.warn("[v0] User denied event edit access:", userId, eventId)
    return redirect("/403")
  }

  console.log("[v0] Event staff edit access granted:", eventId)
  return <>{children}</>
}
