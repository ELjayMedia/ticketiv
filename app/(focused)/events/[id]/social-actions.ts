"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface EventInviteCandidate {
  handle: string
  displayName: string
  avatarUrl: string | null
  isGoing: boolean
  inviteStatus: "pending" | "dismissed" | "cancelled" | null
}

export interface EventSocialContextResult {
  ok: boolean
  signedIn: boolean
  candidates: EventInviteCandidate[]
  error?: string
}

export interface InviteFriendsResult {
  ok: boolean
  invitedHandles: string[]
  error?: string
}

function isInviteStatus(value: unknown): EventInviteCandidate["inviteStatus"] {
  return value === "pending" || value === "dismissed" || value === "cancelled" ? value : null
}

async function signedInClient() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return null
  return supabase
}

export async function getEventSocialContextAction(eventId: string): Promise<EventSocialContextResult> {
  const supabase = await signedInClient()
  if (!supabase) return { ok: true, signedIn: false, candidates: [] }

  // TICK-387 RPC precedes the next generated Database type refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("fn_event_invite_candidates", {
    p_event_id: eventId,
  })

  if (error) {
    console.error("[event-social] fn_event_invite_candidates:", error)
    return {
      ok: false,
      signedIn: true,
      candidates: [],
      error: "Could not load your friends for this event.",
    }
  }

  const rows = Array.isArray(data) ? data : []
  const candidates = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const record = row as Record<string, unknown>
    if (typeof record.handle !== "string" || typeof record.display_name !== "string") return []

    return [{
      handle: record.handle,
      displayName: record.display_name,
      avatarUrl: typeof record.avatar_url === "string" ? record.avatar_url : null,
      isGoing: record.is_going === true,
      inviteStatus: isInviteStatus(record.invite_status),
    } satisfies EventInviteCandidate]
  })

  return { ok: true, signedIn: true, candidates }
}

export async function inviteFriendsToEventAction(
  eventId: string,
  handles: string[],
): Promise<InviteFriendsResult> {
  const normalized = Array.from(
    new Set(
      handles
        .map((handle) => String(handle ?? "").trim().replace(/^@/, ""))
        .filter(Boolean),
    ),
  )

  if (normalized.length === 0) return { ok: true, invitedHandles: [] }
  if (normalized.length > 20) {
    return { ok: false, invitedHandles: [], error: "Choose up to 20 friends at a time." }
  }

  const supabase = await signedInClient()
  if (!supabase) return { ok: false, invitedHandles: [], error: "Sign in to invite friends." }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("fn_invite_friends_to_event", {
    p_event_id: eventId,
    p_handles: normalized,
  })

  if (error) {
    console.error("[event-social] fn_invite_friends_to_event:", error)
    const rateLimited = String(error.message ?? "").toLowerCase().includes("rate_limited")
    return {
      ok: false,
      invitedHandles: [],
      error: rateLimited
        ? "You have sent several event invites recently. Try again later."
        : "Could not send these event invitations right now.",
    }
  }

  const invitedHandles = (Array.isArray(data) ? data : []).flatMap((row) => {
    if (!row || typeof row !== "object") return []
    const handle = (row as Record<string, unknown>).handle
    return typeof handle === "string" ? [handle] : []
  })

  revalidatePath("/notifications")
  return { ok: true, invitedHandles }
}
