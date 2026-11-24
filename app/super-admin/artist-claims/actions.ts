"use server"

import { revalidatePath } from "next/cache"

import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, type ConsoleActionResult } from "@/lib/super-admin/console"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { artistErrorMessage } from "@/lib/artists/core"

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })

/**
 * Approve or reject an artist claim. fn_review_artist_claim re-checks the admin
 * (app.can_platform_mutate), notifies the claimant and writes the audit row.
 * Replacing an existing owner is an explicit, separate choice.
 */
export async function reviewArtistClaimAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("review_artist_claim")
  if (!context) return fail("Your role can't do this. Ask the owner, or leave a note instead.")

  const claimId = String(formData.get("claimId") ?? "")
  const intent = String(formData.get("intent") ?? "")
  const note = String(formData.get("note") ?? "").trim()
  if (!isUuid(claimId)) return fail("That request no longer exists.")
  if (!["approve", "approve_replace", "reject"].includes(intent)) return fail("Choose what to do with the request.")
  if (intent === "reject" && note.length < 5) return fail("Say why you're rejecting it. The requester sees this.")
  if (intent === "approve_replace" && note.length < 5) return fail("Record how you verified ownership before replacing the owner.")
  if (note.length > 2000) return fail("Keep the note under 2,000 characters.")

  // The artist RPCs are newer than the generated Database types.
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_review_artist_claim", {
    p_claim_id: claimId,
    p_approve: intent !== "reject",
    p_note: note || null,
    p_replace_owner: intent === "approve_replace",
  })
  if (error) {
    if (String(error.message).includes("artist_already_owned")) {
      return fail("This artist already has an owner. Contact both people, then use \"Approve and replace owner\" if the claim is genuine.")
    }
    return fail(artistErrorMessage(error))
  }

  revalidatePath("/super-admin/artist-claims")
  return {
    status: "done",
    message:
      intent === "reject"
        ? "Rejected. The requester has been told why."
        : intent === "approve_replace"
          ? "Approved. The previous owner is now a manager, and both changes are in the audit log."
          : "Approved. The requester can manage the artist now.",
  }
}

/** TICK-353: merge a duplicate artist into the canonical profile (line-ups, follows, managers move; old URL redirects). */
export async function mergeArtistsAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("review_artist_claim")
  if (!context) return fail("Your role can't do this.")
  const source = String(formData.get("sourceId") ?? "").trim()
  const target = String(formData.get("targetId") ?? "").trim()
  const note = String(formData.get("note") ?? "").trim()
  if (!isUuid(source) || !isUuid(target)) return fail("Enter both artist IDs.")
  if (note.length < 5) return fail("Say why these are the same artist. This goes in the audit log.")
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_admin_merge_artists", { p_source: source, p_target: target, p_note: note })
  if (error) return fail(artistErrorMessage(error))
  revalidatePath("/super-admin/artist-claims")
  const r = (data ?? {}) as { lineups_moved?: number; follows_moved?: number }
  return { status: "done", message: `Merged. ${r.lineups_moved ?? 0} line-up(s) and ${r.follows_moved ?? 0} follower(s) moved; the old URL redirects.` }
}

/** TICK-353: roll back a claim approved in error. Line-ups and followers stay. */
export async function resetArtistOwnerAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("review_artist_claim")
  if (!context) return fail("Your role can't do this.")
  const artistId = String(formData.get("artistId") ?? "").trim()
  const note = String(formData.get("note") ?? "").trim()
  if (!isUuid(artistId)) return fail("Enter the artist ID.")
  if (note.length < 5) return fail("Say why the owner is being removed. This goes in the audit log.")
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_admin_reset_artist_owner", { p_artist_id: artistId, p_note: note })
  if (error) return fail(artistErrorMessage(error))
  revalidatePath("/super-admin/artist-claims")
  return { status: "done", message: "Owner and managers removed. The profile is unverified and can be claimed again." }
}
