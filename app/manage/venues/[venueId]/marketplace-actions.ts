"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { UUID_RE, venueErrorMessage } from "@/lib/venues/core"
import { ACCESSIBILITY, AMENITIES, isRateUnit, pickKeys, rangeFromForm } from "@/lib/venues/marketplace"
import type { VenueActionResult } from "@/app/manage/venues/[venueId]/actions"

// TICK-482 / TICK-460 venue-side actions. Every RPC re-checks the caller's role.
type Loose = any

const fail = (message: string): VenueActionResult => ({ ok: false, message })

function str(formData: FormData, key: string, max: number): string | null {
  const v = String(formData.get(key) ?? "").trim()
  return v ? v.slice(0, max) : null
}

function int(formData: FormData, key: string, min: number, max: number): number | null | "invalid" {
  const raw = String(formData.get(key) ?? "").trim()
  if (!raw) return null
  const n = Number(raw)
  return Number.isInteger(n) && n >= min && n <= max ? n : "invalid"
}

function rpcClient(): Loose | null {
  return createServerSupabaseClient() as Loose
}

export async function saveVenueSpaceAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const spaceId = String(formData.get("spaceId") ?? "")
  if (!UUID_RE.test(venueId) || (spaceId && !UUID_RE.test(spaceId))) return fail("That space no longer exists.")
  const name = str(formData, "name", 80)
  if (!name || name.length < 2) return fail("Give the space a name.")
  const standing = int(formData, "capacityStanding", 1, 200000)
  const seated = int(formData, "capacitySeated", 1, 200000)
  if (standing === "invalid" || seated === "invalid") return fail("Capacity must be a whole number between 1 and 200,000.")
  const rateRaw = String(formData.get("rate") ?? "").trim()
  let rateCents: number | null = null
  if (rateRaw) {
    const amount = Number(rateRaw.replace(/,/g, ""))
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return fail("Enter the rate as an amount, e.g. 15000.")
    rateCents = Math.round(amount * 100)
  }
  const rateUnit = String(formData.get("rateUnit") ?? "")
  if (rateCents !== null && !isRateUnit(rateUnit)) return fail("Say whether the rate is per hour, day or event.")
  const images = String(formData.get("imageUrls") ?? "")
    .split(/\s+/)
    .map((u) => u.trim())
    .filter(Boolean)
  if (images.length > 8 || images.some((u) => !u.startsWith("https://"))) return fail("Use up to 8 image links, each starting with https://.")

  const supabase = rpcClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_save_venue_space", {
    p_venue_id: venueId,
    p_space_id: spaceId || null,
    p_name: name,
    p_description: str(formData, "description", 2000),
    p_capacity_standing: standing,
    p_capacity_seated: seated,
    p_amenities: pickKeys(formData.getAll("amenities"), AMENITIES),
    p_accessibility: pickKeys(formData.getAll("accessibility"), ACCESSIBILITY),
    p_image_urls: images,
    p_rate_cents: rateCents,
    p_rate_currency: "SZL",
    p_rate_unit: rateCents !== null ? rateUnit : null,
    p_rate_note: str(formData, "rateNote", 300),
    p_is_public: formData.get("isPublic") === "on",
  })
  if (error) return fail(venueErrorMessage(error))
  revalidatePath(`/manage/venues/${venueId}/spaces`)
  return { ok: true, message: spaceId ? "Space saved." : "Space added." }
}

export async function deleteVenueSpaceAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const spaceId = String(formData.get("spaceId") ?? "")
  if (!UUID_RE.test(venueId) || !UUID_RE.test(spaceId)) return fail("That space no longer exists.")
  const supabase = rpcClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_delete_venue_space", { p_space_id: spaceId })
  if (error) return fail(venueErrorMessage(error))
  revalidatePath(`/manage/venues/${venueId}/spaces`)
  return { ok: true, message: "Space deleted." }
}

export async function addVenueBlockAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const spaceId = String(formData.get("spaceId") ?? "")
  if (!UUID_RE.test(venueId) || (spaceId && !UUID_RE.test(spaceId))) return fail("That venue no longer exists.")
  const fromDate = String(formData.get("fromDate") ?? "")
  const toDate = String(formData.get("toDate") ?? "") || fromDate
  const start = rangeFromForm(fromDate, "00:00", "00:00")
  const end = rangeFromForm(toDate, "00:00", "00:00")
  if (!start || !end || end.endsAt <= start.startsAt) return fail("Choose the first and last day to block.")
  const supabase = rpcClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_add_venue_block", {
    p_venue_id: venueId,
    p_space_id: spaceId || null,
    p_starts_at: start.startsAt,
    p_ends_at: end.endsAt,
    p_note: str(formData, "note", 300),
  })
  if (error) return fail(venueErrorMessage(error))
  revalidatePath(`/manage/venues/${venueId}/calendar`)
  return { ok: true, message: "Dates blocked." }
}

export async function removeVenueBlockAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const blockId = String(formData.get("blockId") ?? "")
  if (!UUID_RE.test(venueId) || !UUID_RE.test(blockId)) return fail("That block no longer exists.")
  const supabase = rpcClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_remove_venue_block", { p_block_id: blockId })
  if (error) return fail(venueErrorMessage(error))
  revalidatePath(`/manage/venues/${venueId}/calendar`)
  return { ok: true, message: "Block removed." }
}

export async function decideVenueEnquiryAction(_prev: VenueActionResult | null, formData: FormData): Promise<VenueActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const enquiryId = String(formData.get("enquiryId") ?? "")
  const decision = String(formData.get("decision") ?? "")
  if (!UUID_RE.test(venueId) || !UUID_RE.test(enquiryId) || !["accept", "decline"].includes(decision)) return fail("That enquiry no longer exists.")
  const supabase = rpcClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_decide_venue_enquiry", {
    p_enquiry_id: enquiryId,
    p_accept: decision === "accept",
    p_note: str(formData, "note", 1000),
  })
  if (error) return fail(venueErrorMessage(error))
  revalidatePath(`/manage/venues/${venueId}/enquiries`, "layout")
  revalidatePath(`/manage/venues/${venueId}/calendar`)
  return { ok: true, message: decision === "accept" ? "Accepted. The date is now booked." : "Declined." }
}
