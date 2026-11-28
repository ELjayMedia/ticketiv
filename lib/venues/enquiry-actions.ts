"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { UUID_RE, venueErrorMessage } from "@/lib/venues/core"
import { rangeFromForm } from "@/lib/venues/marketplace"

// TICK-460 enquiry actions used by both sides of the conversation. The RPCs
// decide who may do what; these only validate input and refresh the pages.
type Loose = any
export type EnquiryActionResult = { ok: true; message: string } | { ok: false; message: string }

const fail = (message: string): EnquiryActionResult => ({ ok: false, message })

function refresh(enquiryId: string, venueId: string, orgId: string) {
  if (UUID_RE.test(venueId)) {
    revalidatePath(`/manage/venues/${venueId}/enquiries/${enquiryId}`)
    revalidatePath(`/manage/venues/${venueId}/enquiries`)
    revalidatePath(`/manage/venues/${venueId}/calendar`)
    revalidatePath(`/manage/venues/${venueId}/bookings`)
    revalidatePath(`/manage/venues/${venueId}`)
  }
  if (UUID_RE.test(orgId)) {
    revalidatePath(`/orgs/${orgId}/venue-enquiries/${enquiryId}`)
    revalidatePath(`/orgs/${orgId}/venue-enquiries`)
  }
}

function ids(formData: FormData) {
  return {
    enquiryId: String(formData.get("enquiryId") ?? ""),
    venueId: String(formData.get("venueId") ?? ""),
    orgId: String(formData.get("orgId") ?? ""),
  }
}

export async function replyToEnquiryAction(_prev: EnquiryActionResult | null, formData: FormData): Promise<EnquiryActionResult> {
  const { enquiryId, venueId, orgId } = ids(formData)
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000)
  if (!UUID_RE.test(enquiryId)) return fail("That enquiry no longer exists.")
  if (!body) return fail("Write a message first.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_post_venue_enquiry_message", { p_enquiry_id: enquiryId, p_body: body })
  if (error) return fail(venueErrorMessage(error))
  refresh(enquiryId, venueId, orgId)
  return { ok: true, message: "Sent." }
}

export async function cancelVenueBookingAction(_prev: EnquiryActionResult | null, formData: FormData): Promise<EnquiryActionResult> {
  const { enquiryId, venueId, orgId } = ids(formData)
  const bookingId = String(formData.get("bookingId") ?? "")
  if (!UUID_RE.test(bookingId)) return fail("That booking no longer exists.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_cancel_venue_booking", {
    p_booking_id: bookingId,
    p_reason: String(formData.get("reason") ?? "").trim().slice(0, 500),
  })
  if (error) return fail(venueErrorMessage(error))
  refresh(enquiryId, venueId, orgId)
  return { ok: true, message: "Booking cancelled. The date is free again." }
}

export async function submitVenueEnquiryAction(_prev: EnquiryActionResult | null, formData: FormData): Promise<EnquiryActionResult> {
  const venueId = String(formData.get("venueId") ?? "")
  const orgId = String(formData.get("orgId") ?? "")
  const spaceId = String(formData.get("spaceId") ?? "")
  const venueSlug = String(formData.get("venueSlug") ?? "")
  if (!UUID_RE.test(venueId) || (spaceId && !UUID_RE.test(spaceId))) return fail("That venue no longer exists.")
  if (!UUID_RE.test(orgId)) return fail("Choose which organisation the event is for.")
  const range = rangeFromForm(String(formData.get("date") ?? ""), String(formData.get("startTime") ?? ""), String(formData.get("endTime") ?? ""))
  if (!range) return fail("Choose the date, start time and end time.")
  const attendanceRaw = String(formData.get("attendance") ?? "").trim()
  const attendance = attendanceRaw ? Number(attendanceRaw) : null
  if (attendance !== null && (!Number.isInteger(attendance) || attendance < 1 || attendance > 200000)) return fail("Expected attendance must be a whole number.")
  const budgetRaw = String(formData.get("budget") ?? "").replace(/,/g, "").trim()
  const budget = budgetRaw ? Number(budgetRaw) : null
  if (budget !== null && (!Number.isFinite(budget) || budget < 0 || budget > 1_000_000)) return fail("Enter the budget as an amount, e.g. 10000.")
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000)

  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_submit_venue_enquiry", {
    p_venue_id: venueId,
    p_space_id: spaceId || null,
    p_org_id: orgId,
    p_starts_at: range.startsAt,
    p_ends_at: range.endsAt,
    p_expected_attendance: attendance,
    p_budget_cents: budget === null ? null : Math.round(budget * 100),
    p_currency: "SZL",
    p_message: message,
  })
  if (error) return fail(venueErrorMessage(error))
  revalidatePath(`/orgs/${orgId}/venue-enquiries`)
  if (venueSlug) revalidatePath(`/venues/${venueSlug}`)
  redirect(`/orgs/${orgId}/venue-enquiries/${data}`)
}

export async function withdrawVenueEnquiryAction(_prev: EnquiryActionResult | null, formData: FormData): Promise<EnquiryActionResult> {
  const { enquiryId, venueId, orgId } = ids(formData)
  if (!UUID_RE.test(enquiryId)) return fail("That enquiry no longer exists.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_withdraw_venue_enquiry", { p_enquiry_id: enquiryId })
  if (error) return fail(venueErrorMessage(error))
  refresh(enquiryId, venueId, orgId)
  return { ok: true, message: "Enquiry withdrawn." }
}

export async function createEventFromBookingAction(_prev: EnquiryActionResult | null, formData: FormData): Promise<EnquiryActionResult> {
  const { orgId } = ids(formData)
  const bookingId = String(formData.get("bookingId") ?? "")
  const title = String(formData.get("title") ?? "").trim().slice(0, 200)
  if (!UUID_RE.test(bookingId) || !UUID_RE.test(orgId)) return fail("That booking no longer exists.")
  if (!title) return fail("Give the event a name.")
  const supabase = createServerSupabaseClient() as Loose
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_create_event_from_booking", { p_booking_id: bookingId, p_title: title })
  if (error) return fail(venueErrorMessage(error))
  redirect(`/orgs/${orgId}/events/${data}/edit?step=basics`)
}
