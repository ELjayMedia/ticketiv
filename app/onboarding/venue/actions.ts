"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { existingVenueIdFromError, UUID_RE, VENUE_EVIDENCE_MIN, venueErrorMessage } from "@/lib/venues/core"

export interface ClaimableVenue {
  id: string
  name: string
  city: string | null
  verified: boolean
  hasOwner: boolean
}

export type SearchResult = { ok: true; venues: ClaimableVenue[] } | { ok: false; message: string }
export type ClaimResult = { ok: true; message: string } | { ok: false; message: string }
export type CreateResult =
  | { ok: true; venueId: string }
  | { ok: false; message: string; existingVenueId?: string }

export async function searchClaimableVenuesAction(query: string): Promise<SearchResult> {
  const q = (query ?? "").trim().slice(0, 120)
  if (q.length < 2) return { ok: true, venues: [] }
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { data, error } = await supabase.rpc("fn_search_claimable_venues", { p_query: q })
  if (error) return { ok: false, message: venueErrorMessage(error) }
  return {
    ok: true,
    venues: (data ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      verified: v.verification_status === "verified",
      hasOwner: v.has_owner,
    })),
  }
}

export async function submitVenueClaimAction(input: {
  venueId: string
  role: string
  evidence: string
  phone?: string
}): Promise<ClaimResult> {
  if (!UUID_RE.test(input.venueId)) return { ok: false, message: "Choose a venue from the search." }
  if (input.role !== "venue_owner" && input.role !== "venue_manager") return { ok: false, message: "Choose your role at the venue." }
  const evidence = (input.evidence ?? "").trim()
  if (evidence.length < VENUE_EVIDENCE_MIN) {
    return { ok: false, message: `Tell us how you're connected to the venue (at least ${VENUE_EVIDENCE_MIN} characters).` }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { error } = await supabase.rpc("fn_submit_venue_claim", {
    p_venue_id: input.venueId,
    p_claimant_role: input.role,
    p_evidence: evidence.slice(0, 2000),
    p_contact_phone: (input.phone ?? "").trim().slice(0, 40) || null,
  })
  if (error) return { ok: false, message: venueErrorMessage(error) }

  revalidatePath("/onboarding/venue")
  return { ok: true, message: "Request sent. We'll notify you when it's reviewed, usually within two working days." }
}

export async function createVenueAction(input: {
  name: string
  city: string
  address?: string
  capacity?: string
  evidence: string
  phone?: string
}): Promise<CreateResult> {
  const capacity = input.capacity?.trim() ? Number(input.capacity) : null
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 200000)) {
    return { ok: false, message: "Capacity must be a whole number between 1 and 200,000." }
  }
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { data, error } = await supabase.rpc("fn_create_venue_profile", {
    p_name: (input.name ?? "").trim().slice(0, 160),
    p_city: (input.city ?? "").trim().slice(0, 120),
    p_address: (input.address ?? "").trim().slice(0, 300) || null,
    p_capacity: capacity,
    p_evidence: (input.evidence ?? "").trim().slice(0, 2000),
    p_contact_phone: (input.phone ?? "").trim().slice(0, 40) || null,
  })
  if (error) {
    return { ok: false, message: venueErrorMessage(error), existingVenueId: existingVenueIdFromError(error) ?? undefined }
  }
  const venueId = (data as { venue_id?: string } | null)?.venue_id
  if (!venueId || !UUID_RE.test(venueId)) return { ok: false, message: "The venue was created but didn't return an id. Refresh and check your workspaces." }
  return { ok: true, venueId }
}

export async function withdrawVenueClaimAction(claimId: string): Promise<ClaimResult> {
  if (!UUID_RE.test(claimId)) return { ok: false, message: "That request can't be withdrawn any more." }
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { error } = await supabase.rpc("fn_withdraw_venue_claim", { p_claim_id: claimId })
  if (error) return { ok: false, message: venueErrorMessage(error) }
  revalidatePath("/onboarding/venue")
  return { ok: true, message: "Request withdrawn." }
}
