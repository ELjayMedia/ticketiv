import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { mapMyFollows, type MyFollow } from "@/lib/follows/my-follows"

/** Everything the signed-in user follows; null when signed out or a guest session. */
export async function getMyFollows(): Promise<MyFollow[] | null> {
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return null
  const { data, error } = await supabase.rpc("fn_my_follows")
  if (error) return []
  return mapMyFollows(data)
}
