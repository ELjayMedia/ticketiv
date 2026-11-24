"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Follow organisers and artists from the event page. Event pages are cached
 * and public, so who-follows-what is read here, after the page loads, for the
 * signed-in viewer only. Writes go through the SECURITY DEFINER follow RPCs.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type FollowKind = "organizer" | "artist" | "venue"

export interface FollowState {
  /** False for signed-out visitors and guest-checkout sessions. */
  signedIn: boolean
  organizer: boolean
  artistIds: string[]
}

export type SetFollowResult =
  | { ok: true; following: boolean }
  | { ok: false; reason: "sign_in" | "error"; message: string }

// The follow tables and RPCs are newer than the generated Database types.
type Loose = any

async function viewer() {
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // A guest-checkout session is anonymous: following needs a real account so
  // announcements reach the same person next time.
  if (!user || user.is_anonymous) return null
  return { supabase, userId: user.id as string }
}

export async function getFollowStateAction(orgId: string | null, artistIds: string[]): Promise<FollowState> {
  const me = await viewer()
  if (!me) return { signedIn: false, organizer: false, artistIds: [] }

  const ids = artistIds.filter((id) => UUID.test(id)).slice(0, 50)
  const [orgRes, artistRes] = await Promise.all([
    orgId && UUID.test(orgId)
      ? me.supabase.from("org_follows").select("org_id").eq("user_id", me.userId).eq("org_id", orgId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    ids.length > 0
      ? me.supabase.from("artist_follows").select("artist_id").eq("user_id", me.userId).in("artist_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (orgRes.error) console.error("[follows] org state:", orgRes.error)
  if (artistRes.error) console.error("[follows] artist state:", artistRes.error)

  return {
    signedIn: true,
    organizer: Boolean(orgRes.data),
    artistIds: ((artistRes.data ?? []) as Array<{ artist_id: string }>).map((row) => row.artist_id),
  }
}

export async function setFollowAction(kind: FollowKind, id: string, follow: boolean): Promise<SetFollowResult> {
  if (!UUID.test(id)) return { ok: false, reason: "error", message: "Not found." }
  const me = await viewer()
  if (!me) return { ok: false, reason: "sign_in", message: "Log in to follow." }

  const { error } =
    kind === "organizer"
      ? await me.supabase.rpc("fn_set_org_follow", { p_org_id: id, p_follow: follow })
      : kind === "venue"
        ? await me.supabase.rpc("fn_set_venue_follow", { p_venue_id: id, p_follow: follow })
        : await me.supabase.rpc("fn_set_artist_follow", { p_artist_id: id, p_follow: follow })
  if (error) {
    console.error(`[follows] set ${kind}:`, error)
    return { ok: false, reason: "error", message: "Couldn't update that right now. Try again." }
  }
  return { ok: true, following: follow }
}
