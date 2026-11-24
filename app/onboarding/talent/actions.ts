"use server"

import { revalidatePath } from "next/cache"

import { artistErrorMessage } from "@/lib/artists/core"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { UUID_RE } from "@/lib/venues/core"

export type CreateTalentResult =
  | { ok: true; artistId: string; slug: string; existing: boolean }
  | { ok: false; error: string; existingArtistId?: string }

export interface ClaimableArtist {
  id: string
  name: string
  verified: boolean
  hasOwner: boolean
  upcomingEvents: number
}

export interface MyArtistClaim {
  id: string
  artistId: string
  artistName: string
  status: "pending" | "approved" | "rejected" | "withdrawn"
  reviewNote: string | null
}

// TICK-272 talent claim door; TICK-353 points to the existing profile when the
// name is already on a line-up (artist names are unique on Ticketiv).
export async function createTalentProfileAction(input: { name: string }): Promise<CreateTalentResult> {
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return { ok: false, error: "Ticketiv could not connect. Please try again." }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Please sign in before creating a talent profile." }

  const name = (input.name ?? "").trim()
  if (!name) return { ok: false, error: "Enter your artist or performer name." }

  const { data, error } = await supabase.rpc("fn_create_talent_profile", { p_name: name })
  if (error) {
    if (String(error.message).includes("artist_exists")) {
      const id = String(error.details ?? "").trim()
      return { ok: false, error: artistErrorMessage(error), existingArtistId: UUID_RE.test(id) ? id : undefined }
    }
    if (String(error.message).includes("name_required")) return { ok: false, error: "Enter your artist or performer name." }
    console.error("fn_create_talent_profile failed", error)
    return { ok: false, error: artistErrorMessage(error) }
  }

  const result = (data ?? {}) as { id?: string; slug?: string; existing?: boolean }
  if (!result.id) return { ok: false, error: "Talent profile was created but did not return an id." }
  return { ok: true, artistId: result.id, slug: result.slug ?? "", existing: Boolean(result.existing) }
}

export async function searchClaimableArtistsAction(query: string): Promise<{ ok: true; artists: ClaimableArtist[] } | { ok: false; error: string }> {
  const q = (query ?? "").trim().slice(0, 120)
  if (q.length < 2) return { ok: true, artists: [] }
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return { ok: false, error: "Sign in again and retry." }
  const { data, error } = await supabase.rpc("fn_search_claimable_artists", { p_query: q })
  if (error) return { ok: false, error: artistErrorMessage(error) }
  return {
    ok: true,
    artists: ((data ?? []) as any[]).map((a) => ({
      id: a.id,
      name: a.name,
      verified: a.verification_status === "verified",
      hasOwner: Boolean(a.has_owner),
      upcomingEvents: Number(a.upcoming_events ?? 0),
    })),
  }
}

export async function submitArtistClaimAction(input: { artistId: string; role: string; evidence: string; phone?: string }): Promise<{ ok: boolean; message: string }> {
  if (!UUID_RE.test(input.artistId)) return { ok: false, message: "Choose an artist from the search." }
  if (input.role !== "artist_owner" && input.role !== "artist_manager") return { ok: false, message: "Choose your role." }
  const evidence = (input.evidence ?? "").trim()
  if (evidence.length < 20) return { ok: false, message: "Tell us how you're connected to the artist (at least 20 characters)." }
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { error } = await supabase.rpc("fn_submit_artist_claim", {
    p_artist_id: input.artistId,
    p_claimant_role: input.role,
    p_evidence: evidence.slice(0, 2000),
    p_contact_phone: (input.phone ?? "").trim().slice(0, 40) || null,
  })
  if (error) return { ok: false, message: artistErrorMessage(error) }
  revalidatePath("/onboarding/talent")
  return { ok: true, message: "Request sent. We'll notify you when it's reviewed, usually within two working days." }
}

export async function withdrawArtistClaimAction(claimId: string): Promise<{ ok: boolean; message: string }> {
  if (!UUID_RE.test(claimId)) return { ok: false, message: "That request can't be withdrawn any more." }
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return { ok: false, message: "Sign in again and retry." }
  const { error } = await supabase.rpc("fn_withdraw_artist_claim", { p_claim_id: claimId })
  if (error) return { ok: false, message: artistErrorMessage(error) }
  revalidatePath("/onboarding/talent")
  return { ok: true, message: "Request withdrawn." }
}

export async function listMyArtistClaimsAction(): Promise<MyArtistClaim[]> {
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return []
  const { data } = await supabase.rpc("fn_my_artist_claims")
  return ((data ?? []) as any[]).map((c) => ({ id: c.id, artistId: c.artist_id, artistName: c.artist_name, status: c.status, reviewNote: c.review_note }))
}
