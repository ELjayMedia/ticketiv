"use server"

import { revalidatePath } from "next/cache"

import { ARTIST_LINK_KEYS, artistErrorMessage, cleanLinks, parseGenres } from "@/lib/artists/core"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { UUID_RE } from "@/lib/venues/core"

export type ArtistActionResult = { ok: true; message: string } | { ok: false; message: string }
const fail = (message: string): ArtistActionResult => ({ ok: false, message })

function text(formData: FormData, key: string, max: number): string | null {
  const v = String(formData.get(key) ?? "").trim()
  return v ? v.slice(0, max) : null
}

/** Save the public profile and press kit. fn_update_artist_profile re-checks membership and validates links. */
export async function updateArtistProfileAction(_prev: ArtistActionResult | null, formData: FormData): Promise<ArtistActionResult> {
  const artistId = String(formData.get("artistId") ?? "")
  if (!UUID_RE.test(artistId)) return fail("That artist no longer exists.")
  const links = cleanLinks(Object.fromEntries(ARTIST_LINK_KEYS.map(([k]) => [k, String(formData.get(`link_${k}`) ?? "")])))

  const supabase = createServerSupabaseClient() as any
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_update_artist_profile", {
    p_artist_id: artistId,
    p_bio: text(formData, "bio", 4000),
    p_performer_type: text(formData, "performerType", 20),
    p_genres: parseGenres(String(formData.get("genres") ?? "")),
    p_image_url: text(formData, "imageUrl", 500),
    p_cover_image_url: text(formData, "coverImageUrl", 500),
    p_links: links,
    p_press_kit_url: text(formData, "pressKitUrl", 500),
    p_booking_email: text(formData, "bookingEmail", 320),
    p_booking_info: text(formData, "bookingInfo", 2000),
  })
  if (error) return fail(artistErrorMessage(error))
  revalidatePath(`/manage/artists/${artistId}`, "layout")
  revalidatePath(`/artists/${artistId}`)
  return { ok: true, message: "Profile saved." }
}

export async function addArtistManagerAction(_prev: ArtistActionResult | null, formData: FormData): Promise<ArtistActionResult> {
  const artistId = String(formData.get("artistId") ?? "")
  const email = String(formData.get("email") ?? "").trim()
  if (!UUID_RE.test(artistId)) return fail("That artist no longer exists.")
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Enter the email address on their Ticketiv account.")
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_add_artist_manager", { p_artist_id: artistId, p_email: email })
  if (error) return fail(artistErrorMessage(error))
  if (data === "no_account") return fail("No Ticketiv account uses that email. Ask them to sign up first, then add them.")
  revalidatePath(`/manage/artists/${artistId}/team`)
  return { ok: true, message: "Manager added." }
}

export async function removeArtistMemberAction(_prev: ArtistActionResult | null, formData: FormData): Promise<ArtistActionResult> {
  const artistId = String(formData.get("artistId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  if (!UUID_RE.test(artistId) || !UUID_RE.test(userId)) return fail("That person no longer manages this artist.")
  const supabase = createServerSupabaseClient() as any
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_remove_artist_member", { p_artist_id: artistId, p_user_id: userId })
  if (error) return fail(artistErrorMessage(error))
  revalidatePath(`/manage/artists/${artistId}/team`)
  return { ok: true, message: "Removed." }
}
