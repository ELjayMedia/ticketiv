import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type FollowTarget = "organizer" | "artist" | "venue"

export interface FollowSnapshot {
  signedIn: boolean
  following: boolean
  followerCount: number
}

const TABLE: Record<FollowTarget, { table: string; column: string }> = {
  organizer: { table: "org_follows", column: "org_id" },
  artist: { table: "artist_follows", column: "artist_id" },
  venue: { table: "venue_follows", column: "venue_id" },
}

/**
 * Public follower count (fn_follower_count; the follow tables are select-own)
 * plus whether the signed-in viewer follows. Guest-checkout sessions count as
 * signed out because following needs a real account.
 */
export async function getFollowSnapshot(kind: FollowTarget, id: string): Promise<FollowSnapshot> {
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return { signedIn: false, following: false, followerCount: 0 }
  const [countRes, userRes] = await Promise.all([
    supabase.rpc("fn_follower_count", { p_kind: kind, p_id: id }),
    supabase.auth.getUser(),
  ])
  const followerCount = typeof countRes.data === "number" ? countRes.data : 0
  const user = userRes.data?.user
  if (!user || user.is_anonymous) return { signedIn: false, following: false, followerCount }
  const { table, column } = TABLE[kind]
  const { data } = await supabase.from(table).select(column).eq("user_id", user.id).eq(column, id).maybeSingle()
  return { signedIn: true, following: Boolean(data), followerCount }
}
