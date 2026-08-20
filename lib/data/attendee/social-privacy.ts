import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface SocialPrivacySettings {
  profileDiscoverability: "everyone" | "friends"
  allowFriendRequests: boolean
  showEventsGoingToFriends: boolean
  allowFriendSuggestions: boolean
}

const DEFAULTS: SocialPrivacySettings = {
  profileDiscoverability: "everyone",
  allowFriendRequests: true,
  showEventsGoingToFriends: true,
  allowFriendSuggestions: true,
}

export async function getMySocialPrivacySettings(): Promise<SocialPrivacySettings | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // TICK-385 table may precede the next generated Database type refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from as any)("user_privacy_settings")
    .select("profile_discoverability, allow_friend_requests, show_events_going_to_friends, allow_friend_suggestions")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[friends] social privacy read:", error)
    return DEFAULTS
  }

  if (!data) return DEFAULTS

  return {
    profileDiscoverability: data.profile_discoverability === "friends" ? "friends" : "everyone",
    allowFriendRequests: data.allow_friend_requests !== false,
    showEventsGoingToFriends: data.show_events_going_to_friends !== false,
    allowFriendSuggestions: data.allow_friend_suggestions !== false,
  }
}
