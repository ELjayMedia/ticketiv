"use server"

import { revalidatePath } from "next/cache"

import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, type ConsoleActionResult } from "@/lib/super-admin/console"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { venueErrorMessage } from "@/lib/venues/core"

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })

/**
 * Approve or reject a venue claim. fn_review_venue_claim re-checks the admin
 * (app.can_platform_mutate), notifies the claimant and writes the audit row.
 * Replacing an existing owner is an explicit, separate choice.
 */
export async function reviewVenueClaimAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("review_venue_claim")
  if (!context) return fail("Your role can't do this. Ask the owner, or leave a note instead.")

  const claimId = String(formData.get("claimId") ?? "")
  const intent = String(formData.get("intent") ?? "")
  const note = String(formData.get("note") ?? "").trim()
  if (!isUuid(claimId)) return fail("That request no longer exists.")
  if (!["approve", "approve_replace", "reject"].includes(intent)) return fail("Choose what to do with the request.")
  if (intent === "reject" && note.length < 5) return fail("Say why you're rejecting it. The requester sees this.")
  if (intent === "approve_replace" && note.length < 5) return fail("Record how you verified ownership before replacing the owner.")
  if (note.length > 2000) return fail("Keep the note under 2,000 characters.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_review_venue_claim", {
    p_claim_id: claimId,
    p_approve: intent !== "reject",
    p_note: note || null,
    p_replace_owner: intent === "approve_replace",
  })
  if (error) {
    if (String(error.message).includes("venue_already_owned")) {
      return fail("This venue already has an owner. Contact both people, then use \"Approve and replace owner\" if the claim is genuine.")
    }
    return fail(venueErrorMessage(error))
  }

  revalidatePath("/super-admin/venue-claims")
  return {
    status: "done",
    message:
      intent === "reject"
        ? "Rejected. The requester has been told why."
        : intent === "approve_replace"
          ? "Approved. The previous owner is now a manager, and both changes are in the audit log."
          : "Approved. The requester can manage the venue now.",
  }
}
