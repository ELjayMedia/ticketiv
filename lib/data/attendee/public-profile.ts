import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface PublicProfile {
  handle: string
  displayName: string
  avatarUrl: string | null
  joinedAt: string | null
  isOwner: boolean
}

interface PublicProfileRow {
  handle: string
  display_name: string
  avatar_url: string | null
  joined_at: string | null
  is_owner: boolean | null
}

const HANDLE_PATTERN = /^[A-Za-z0-9_]{3,30}$/

export async function getPublicProfile(handle: string): Promise<PublicProfile | null> {
  const normalizedHandle = handle.trim()
  if (!HANDLE_PATTERN.test(normalizedHandle)) return null

  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .rpc("get_public_profile", { p_handle: normalizedHandle })
    .maybeSingle<PublicProfileRow>()

  if (error || !data) return null

  return {
    handle: data.handle,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    joinedAt: data.joined_at,
    isOwner: Boolean(data.is_owner),
  }
}
