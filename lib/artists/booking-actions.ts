"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { bookingErrorMessage } from "@/lib/artists/bookings"
import { localDateTimeToIso } from "@/lib/venues/marketplace"

// TICK-461 / TICK-486 actions. The RPCs decide who may do what.
type Loose = any
export type BookingActionResult = { ok: true; message: string } | { ok: false; message: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fail = (message: string): BookingActionResult => ({ ok: false, message })

function money(formData: FormData, key: string): number | null | "invalid" {
  const raw = String(formData.get(key) ?? "").replace(/,/g, "").trim()
  if (!raw) return null
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 && v <= 1_000_000 ? Math.round(v * 100) : "invalid"
}

function refresh(requestId: string, artistId: string, orgId: string) {
  if (UUID.test(artistId)) {
    revalidatePath(`/manage/artists/${artistId}/bookings/${requestId}`)
    revalidatePath(`/manage/artists/${artistId}/bookings`)
  }
  if (UUID.test(orgId)) {
    revalidatePath(`/orgs/${orgId}/artist-bookings/${requestId}`)
    revalidatePath(`/orgs/${orgId}/artist-bookings`)
  }
}

function ids(formData: FormData) {
  return {
    requestId: String(formData.get("requestId") ?? ""),
    artistId: String(formData.get("artistId") ?? ""),
    orgId: String(formData.get("orgId") ?? ""),
  }
}

export async function submitArtistBookingAction(_prev: BookingActionResult | null, formData: FormData): Promise<BookingActionResult> {
  const artistId = String(formData.get("artistId") ?? "")
  const orgId = String(formData.get("orgId") ?? "")
  const eventId = String(formData.get("eventId") ?? "")
  if (!UUID.test(artistId)) return fail("That artist no longer exists.")
  if (!UUID.test(orgId)) return fail("Choose which organisation the booking is for.")
  if (eventId && !UUID.test(eventId)) return fail("Choose one of your events.")
  const startsAt = localDateTimeToIso(String(formData.get("date") ?? ""), String(formData.get("time") ?? ""))
  if (!startsAt) return fail("Choose the date and set time.")
  const min = money(formData, "offerMin")
  const max = money(formData, "offerMax")
  if (min === "invalid" || max === "invalid") return fail("Enter offers as amounts, e.g. 5000.")
  const setRaw = String(formData.get("setMinutes") ?? "").trim()
  const setMinutes = setRaw ? Number(setRaw) : null
  if (setMinutes !== null && (!Number.isInteger(setMinutes) || setMinutes < 5 || setMinutes > 720)) return fail("Set length must be between 5 and 720 minutes.")

  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_submit_artist_booking", {
    p_artist_id: artistId,
    p_org_id: orgId,
    p_event_id: eventId || null,
    p_event_title: String(formData.get("eventTitle") ?? "").trim().slice(0, 200) || null,
    p_starts_at: startsAt,
    p_city: String(formData.get("city") ?? "").trim().slice(0, 80) || null,
    p_set_minutes: setMinutes,
    p_offer_min_cents: min,
    p_offer_max_cents: max,
    p_currency: "SZL",
    p_message: String(formData.get("message") ?? "").trim().slice(0, 4000),
  })
  if (error) return fail(bookingErrorMessage(error))
  redirect(`/orgs/${orgId}/artist-bookings/${data}`)
}

export async function replyToBookingAction(_prev: BookingActionResult | null, formData: FormData): Promise<BookingActionResult> {
  const { requestId, artistId, orgId } = ids(formData)
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000)
  if (!UUID.test(requestId)) return fail("That request no longer exists.")
  if (!body) return fail("Write a message first.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_post_artist_booking_message", { p_request_id: requestId, p_body: body })
  if (error) return fail(bookingErrorMessage(error))
  refresh(requestId, artistId, orgId)
  return { ok: true, message: "Sent." }
}

/** Artist side: accept, decline or counter. */
export async function respondToBookingAction(_prev: BookingActionResult | null, formData: FormData): Promise<BookingActionResult> {
  const { requestId, artistId, orgId } = ids(formData)
  const action = String(formData.get("action") ?? "")
  if (!UUID.test(requestId) || !["accept", "decline", "counter"].includes(action)) return fail("That request no longer exists.")
  const counter = action === "counter" ? money(formData, "counter") : null
  if (counter === "invalid" || (action === "counter" && counter === null)) return fail("Enter your fee for the counter-offer.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_respond_artist_booking", {
    p_request_id: requestId,
    p_action: action,
    p_counter_cents: counter,
    p_note: String(formData.get("note") ?? "").trim().slice(0, 4000) || null,
  })
  if (error) return fail(bookingErrorMessage(error))
  refresh(requestId, artistId, orgId)
  return { ok: true, message: action === "accept" ? "Confirmed. It's on your calendar." : action === "decline" ? "Declined." : "Counter-offer sent." }
}

/** Organiser side: accept a counter-offer or withdraw. */
export async function organizerBookingAction(_prev: BookingActionResult | null, formData: FormData): Promise<BookingActionResult> {
  const { requestId, artistId, orgId } = ids(formData)
  const action = String(formData.get("action") ?? "")
  if (!UUID.test(requestId) || !["accept_counter", "withdraw"].includes(action)) return fail("That request no longer exists.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_organizer_artist_booking", { p_request_id: requestId, p_action: action })
  if (error) return fail(bookingErrorMessage(error))
  refresh(requestId, artistId, orgId)
  return { ok: true, message: action === "withdraw" ? "Request withdrawn." : "Counter-offer accepted. The booking is confirmed." }
}

export async function linkBookingEventAction(_prev: BookingActionResult | null, formData: FormData): Promise<BookingActionResult> {
  const { requestId, artistId, orgId } = ids(formData)
  const eventId = String(formData.get("eventId") ?? "")
  if (!UUID.test(requestId) || !UUID.test(eventId)) return fail("Choose one of your events.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_link_artist_booking_event", { p_request_id: requestId, p_event_id: eventId })
  if (error) return fail(bookingErrorMessage(error))
  refresh(requestId, artistId, orgId)
  return { ok: true, message: "Linked. The artist is on the event's line-up." }
}

export async function postAnnouncementAction(_prev: BookingActionResult | null, formData: FormData): Promise<BookingActionResult> {
  const artistId = String(formData.get("artistId") ?? "")
  if (!UUID.test(artistId)) return fail("That artist no longer exists.")
  const eventId = String(formData.get("eventId") ?? "")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_post_artist_announcement", {
    p_artist_id: artistId,
    p_title: String(formData.get("title") ?? "").trim().slice(0, 120),
    p_body: String(formData.get("body") ?? "").trim().slice(0, 600),
    p_event_id: UUID.test(eventId) ? eventId : null,
  })
  if (error) return fail(bookingErrorMessage(error))
  revalidatePath(`/manage/artists/${artistId}/insights`)
  const sent = typeof data === "number" ? data : 0
  return { ok: true, message: `Sent to ${sent.toLocaleString("en-GB")} follower${sent === 1 ? "" : "s"} in the app.` }
}
