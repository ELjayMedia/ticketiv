"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type FriendRelationshipState =
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "friends"
  | "blocked_by_me"
  | "unavailable"

export interface FriendActionResult {
  ok: boolean
  state?: FriendRelationshipState
  error?: string
}

export interface PeopleSearchResult {
  handle: string
  displayName: string
  avatarUrl: string | null
  relationshipState: FriendRelationshipState
  canRequest: boolean
}

export interface PeopleSearchActionResult {
  ok: boolean
  people: PeopleSearchResult[]
  error?: string
}

export interface SocialPrivacyInput {
  profileDiscoverability: "everyone" | "friends"
  allowFriendRequests: boolean
  showEventsGoingToFriends: boolean
  allowFriendSuggestions: boolean
}

function normalizeHandle(value: string) {
  return value.trim().replace(/^@/, "")
}

function isRelationshipState(value: unknown): value is FriendRelationshipState {
  return (
    value === "none" ||
    value === "outgoing_pending" ||
    value === "incoming_pending" ||
    value === "friends" ||
    value === "blocked_by_me" ||
    value === "unavailable"
  )
}

async function getSignedInClient() {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null
  return supabase
}

async function callStateRpc(
  name:
    | "fn_friend_request"
    | "fn_friend_cancel"
    | "fn_friend_unfriend"
    | "fn_friend_block"
    | "fn_friend_unblock",
  handle: string,
): Promise<FriendActionResult> {
  const normalized = normalizeHandle(handle)
  if (!normalized) return { ok: false, error: "Profile not found." }

  const supabase = await getSignedInClient()
  if (!supabase) return { ok: false, error: "Sign in to manage friends." }

  // These RPCs are introduced by the TICK-385 migration and may not exist in
  // generated database types until the next type refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)(name, { p_handle: normalized })

  if (error) {
    console.error(`[friends] ${name}:`, error)
    return { ok: false, error: "Could not update this friendship right now." }
  }

  const state = isRelationshipState(data) ? data : "none"
  revalidatePath("/friends")
  revalidatePath(`/@${normalized}`)
  return { ok: true, state }
}

export async function sendFriendRequestAction(handle: string) {
  return callStateRpc("fn_friend_request", handle)
}

export async function cancelFriendRequestAction(handle: string) {
  return callStateRpc("fn_friend_cancel", handle)
}

export async function unfriendAction(handle: string) {
  return callStateRpc("fn_friend_unfriend", handle)
}

export async function blockUserAction(handle: string) {
  return callStateRpc("fn_friend_block", handle)
}

export async function unblockUserAction(handle: string) {
  return callStateRpc("fn_friend_unblock", handle)
}

export async function respondFriendRequestAction(
  handle: string,
  accept: boolean,
): Promise<FriendActionResult> {
  const normalized = normalizeHandle(handle)
  if (!normalized) return { ok: false, error: "Profile not found." }

  const supabase = await getSignedInClient()
  if (!supabase) return { ok: false, error: "Sign in to manage friends." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("fn_friend_respond", {
    p_handle: normalized,
    p_accept: accept,
  })

  if (error) {
    console.error("[friends] fn_friend_respond:", error)
    return { ok: false, error: "Could not respond to this request." }
  }

  const state = isRelationshipState(data) ? data : "none"
  revalidatePath("/friends")
  revalidatePath(`/@${normalized}`)
  return { ok: true, state }
}

export async function searchPeopleAction(query: string): Promise<PeopleSearchActionResult> {
  const q = query.trim()
  if (q.length < 2) return { ok: true, people: [] }

  const supabase = await getSignedInClient()
  if (!supabase) return { ok: false, people: [], error: "Sign in to find friends." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("fn_search_friend_profiles", {
    p_query: q,
    p_limit: 12,
  })

  if (error) {
    console.error("[friends] fn_search_friend_profiles:", error)
    return { ok: false, people: [], error: "Could not search people right now." }
  }

  const rows = Array.isArray(data) ? data : []
  const people = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.handle !== "string" || typeof record.display_name !== "string") return []

    return [{
      handle: record.handle,
      displayName: record.display_name,
      avatarUrl: typeof record.avatar_url === "string" ? record.avatar_url : null,
      relationshipState: isRelationshipState(record.relationship_state)
        ? record.relationship_state
        : "none",
      canRequest: record.can_request !== false,
    } satisfies PeopleSearchResult]
  })

  return { ok: true, people }
}

export async function updateSocialPrivacyAction(
  input: SocialPrivacyInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await getSignedInClient()
  if (!supabase) return { ok: false, error: "Sign in to update privacy settings." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.rpc as any)("fn_update_my_social_privacy", {
    p_profile_discoverability: input.profileDiscoverability,
    p_allow_friend_requests: input.allowFriendRequests,
    p_show_events_going_to_friends: input.showEventsGoingToFriends,
    p_allow_friend_suggestions: input.allowFriendSuggestions,
  })

  if (error) {
    console.error("[friends] fn_update_my_social_privacy:", error)
    return { ok: false, error: "Could not save social privacy settings." }
  }

  revalidatePath("/friends")
  revalidatePath("/friends/settings")
  return { ok: true }
}
