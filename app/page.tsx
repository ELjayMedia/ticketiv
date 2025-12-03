import { createServerSupabaseClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function RootPage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    // No Supabase configured, go to public browse
    redirect("/browse")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    // Not authenticated, go to public browse
    redirect("/browse")
  }

  // Authenticated user - check if they're an organizer
  const { data: orgMember } = await supabase.from("org_members").select("role").eq("user_id", session.user.id).single()

  if (orgMember) {
    // User is an organizer, redirect to organizer dashboard
    redirect("/org")
  }

  // Default to attendee app
  redirect("/app")
}
