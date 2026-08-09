// Source: profiles + user_handles + user_notification_preferences +
// event_favourites + transfers + v_my_tickets. RLS-scoped to current user.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface MyProfile {
  id: string
  email: string | null
  name: string
  handle: string | null
  joinedAt: string | null
  avatarUrl: string | null
  upcomingTickets: number
  favouritesCount: number
  friendsCount: number
  followingCount: number
  pendingTransfers: number
  unreadNotifications: number
  remindersEnabled: boolean
}

export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [
    profileRes,
    handleRes,
    upcomingRes,
    favRes,
    friendsRes,
    followingRes,
    transfersRes,
    notificationsRes,
    prefsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, created_at, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_handles")
      .select("handle")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("v_my_tickets")
      .select("order_item_id", { count: "exact", head: true })
      .gte("event_starts_at", new Date().toISOString())
      .is("revoked_at", null),
    supabase
      .from("event_favourites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("user_friends")
      .select("friend_id", { count: "exact", head: true }),
    supabase
      .from("series_follows")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("transfers")
      .select("id", { count: "exact", head: true })
      .eq("to_user_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("user_notification_preferences")
      .select("push_opt_in, in_app_opt_in, email_opt_in")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  const profile = profileRes.data
  const fullName =
    profile?.display_name ||
user.email?.split("@")[0] ||
    "You"

  const prefs = prefsRes.data
  const remindersEnabled = prefs
    ? prefs.push_opt_in ?? prefs.in_app_opt_in ?? prefs.email_opt_in ?? true
    : true

  return {
    id: user.id,
    email: user.email ?? null,
    name: fullName,
    handle: handleRes.data?.handle ?? null,
    joinedAt: profile?.created_at ?? user.created_at ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    upcomingTickets: upcomingRes.count ?? 0,
    favouritesCount: favRes.count ?? 0,
    friendsCount: friendsRes.count ?? 0,
    followingCount: followingRes.count ?? 0,
    pendingTransfers: transfersRes.count ?? 0,
    unreadNotifications: notificationsRes.count ?? 0,
    remindersEnabled: Boolean(remindersEnabled),
  }
}
