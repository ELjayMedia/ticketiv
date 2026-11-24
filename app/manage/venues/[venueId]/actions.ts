"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isVenueRole, UUID_RE, venueErrorMessage } from "@/lib/venues/core"

export type VenueActionResult = { ok: true; message: string } | { ok: false; message: string }

const fail = (message: string): VenueActionResult => ({ ok: false, message })

function text(formData: FormData, key: string, max: number): string | null {
  const value = String(formData.get(key) ?? "").trim()
  return value ? value.slice(0, max) : null
}

/** Save the public profile. fn_update_venue_profile re-checks owner/manager. */
export async function updateVenueProfileAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  if (!UUID_RE.test(venueId)) return fail("That venue no longer exists.")

  const capacityRaw = String(formData.get("capacity") ?? "").trim()
  const capacity = capacityRaw ? Number(capacityRaw) : null
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 200000)) {
    return fail("Capacity must be a whole number between 1 and 200,000.")
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_update_venue_profile", {
    p_venue_id: venueId,
    p_description: text(formData, "description", 4000),
    p_address: text(formData, "address", 300),
    p_capacity: capacity,
    p_website: text(formData, "website", 300),
    p_contact_email: text(formData, "contactEmail", 320),
    p_contact_phone: text(formData, "contactPhone", 40),
    p_venue_type: String(formData.get("venueType") ?? "").trim(),
  })
  if (error) return fail(venueErrorMessage(error))

  revalidatePath(`/manage/venues/${venueId}`, "layout")
  return { ok: true, message: "Profile saved." }
}

/** Add a manager or staff member by the email on their Ticketiv account. */
export async function addVenueMemberAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const email = String(formData.get("email") ?? "").trim()
  const role = String(formData.get("role") ?? "")
  if (!UUID_RE.test(venueId)) return fail("That venue no longer exists.")
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter the email address on their Ticketiv account.")
  if (!isVenueRole(role) || role === "venue_owner") return fail("Choose a role.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_add_venue_member", { p_venue_id: venueId, p_email: email, p_role: role })
  if (error) return fail(venueErrorMessage(error))
  if (data === "no_account") {
    return fail("No Ticketiv account uses that email. Ask them to sign up first, then add them.")
  }

  revalidatePath(`/manage/venues/${venueId}/team`)
  return { ok: true, message: "Added to the team." }
}

export async function removeVenueMemberAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  if (!UUID_RE.test(venueId) || !UUID_RE.test(userId)) return fail("That person is no longer on the team.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_remove_venue_member", { p_venue_id: venueId, p_user_id: userId })
  if (error) return fail(venueErrorMessage(error))

  revalidatePath(`/manage/venues/${venueId}/team`)
  return { ok: true, message: "Removed from the team." }
}
