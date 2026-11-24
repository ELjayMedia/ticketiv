import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { parseFollowerTrend, type FollowerTrend } from "@/lib/follows/trend"

/** Organiser dashboard followers card (TICK-434). Null when unavailable; never throws. */
export async function getOrgFollowerTrend(orgId: string): Promise<FollowerTrend | null> {
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return null
  try {
    const { data, error } = await supabase.rpc("fn_org_follower_trend", { p_org_id: orgId })
    if (error) return null
    return parseFollowerTrend(data)
  } catch {
    return null
  }
}
