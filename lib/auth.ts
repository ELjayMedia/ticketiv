import { createServerSupabaseClient } from "@/lib/supabase-server"
import { createClient } from "@/lib/supabase"

export async function getCurrentUserProfile() {
  const supabase = createServerSupabaseClient()

  if (!supabase) return null

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return null

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

  return { session, profile }
}

export async function getUserWorkspace() {
  const userProfile = await getCurrentUserProfile()

  if (!userProfile?.profile) return "public"

  const supabase = createServerSupabaseClient()
  if (!supabase) return "public"

  // Check if user is an organizer
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userProfile.session.user.id)
    .single()

  if (orgMember?.role === "organizer" || orgMember?.role === "admin") {
    return "organizer"
  }

  // Check if user is staff/scanner
  if (userProfile.profile.role === "staff") {
    return "scanner"
  }

  return "app"
}

export async function signOutUser() {
  const supabase = createClient()

  if (supabase) {
    await supabase.auth.signOut()
  }
}
