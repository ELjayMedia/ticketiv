import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type PublicProfileRelationshipState =
  | "none"
  | "outgoing_pending"
  | "incoming_pending"
  | "friends"
  | "blocked_by_me"

export interface PublicProfile {
  handle: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string | null
  isOwner: boolean
  relationshipState: PublicProfileRelationshipState
}

interface PublicProfileRow {
  handle: string
  display_name: string
  avatar_url: string | null
  joined_at: string | null
  is_owner: boolean | null
  relationship_state: string | null
}

const HANDLE_PATTERN = /^[A-Za-z0-9_]{3,30}$/

function relationshipState(value: string | null): PublicProfileRelationshipState {
  if (
    value === "outgoing_pending" ||
    value === "incoming_pending" ||
    value === "friends" ||
    value === "blocked_by_me"
  ) {
    return value
  }
  return "none"
}

export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const normalizedHandle = handle.trim()
  if (!HANDLE_PATTERN.test(normalizedHandle)) return null

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  // TICK-385 adds privacy/block-aware social profile lookup. Keep the narrow
  // public shape: no email, phone, order or ticket details are returned.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("get_social_public_profile", {
    p_handle: normalizedHandle,
  })

  const row = Array.isArray(data) ? data[0] as PublicProfileRow | undefined : data as PublicProfileRow | null
  if (error || !row) return null

  return {
    handle: row.handle,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    joinedAt: row.joined_at,
    isOwner: Boolean(row.is_owner),
    relationshipState: relationshipState(row.relationship_state),
  }
}
