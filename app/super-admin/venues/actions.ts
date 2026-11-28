"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { sendEmail } from "@/lib/notifications/channels/email"
import { buildTicketivPublicUrl } from "@/lib/public-url"
import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, normalizeEmail, type ConsoleActionResult } from "@/lib/super-admin/console"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { venueErrorMessage } from "@/lib/venues/core"

// Command centre → Venues (venue MVP). The owner creates venues and gives named
// people a venue workspace. Grants go through fn_admin_* RPCs with the admin's
// own session (they re-check super_admin and write the audit row); the service
// role is used only to find or invite the person's account.

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })
const done = (message: string): ConsoleActionResult => ({ status: "done", message })
const NOT_ALLOWED_MESSAGE = "Only the Ticketiv owner can change venue access."
const NOT_ALLOWED = fail(NOT_ALLOWED_MESSAGE)
const ROLES = ["venue_owner", "venue_manager", "venue_staff"] as const
const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  venue_owner: "owner",
  venue_manager: "manager",
  venue_staff: "staff",
}

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function rpcProblem(error: { message?: string } | null): string | null {
  if (!error) return null
  const m = String(error.message ?? "")
  if (m.includes("forbidden")) return NOT_ALLOWED_MESSAGE
  if (m.includes("note_required")) return "Add a note (at least 5 characters) saying why. It goes in the audit log."
  if (m.includes("venue_exists")) return "A venue with that name already exists in that city. Search for it instead."
  if (m.includes("user_not_found")) return "That account no longer exists."
  if (m.includes("not_a_member")) return "That person doesn't have access to this venue."
  return venueErrorMessage(error)
}

export async function createVenueAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("manage_venue_access"))) return NOT_ALLOWED
  const name = field(formData, "name")
  const city = field(formData, "city")
  const address = field(formData, "address")
  const capacityRaw = field(formData, "capacity")
  const capacity = capacityRaw ? Number(capacityRaw) : null
  if (name.length < 2) return fail("Enter the venue's name.")
  if (city.length < 2) return fail("Enter the city or town.")
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1 || capacity > 200000)) return fail("Capacity must be a whole number from 1 to 200,000.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { data, error } = await supabase.rpc("fn_admin_create_venue", { p_name: name, p_city: city, p_address: address || null, p_capacity: capacity })
  const problem = rpcProblem(error)
  if (problem || !data) return fail(problem ?? "Couldn't create the venue.")
  revalidatePath("/super-admin/venues")
  redirect(`/super-admin/venues?v=${data}`)
}

/**
 * Give someone a venue workspace. If the email has no Ticketiv account yet, one
 * is created with an invite link to choose a password (it works once). We never
 * set or show passwords.
 */
export async function assignVenueAdminAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("manage_venue_access")
  if (!context) return NOT_ALLOWED
  const venueId = field(formData, "venueId")
  const email = normalizeEmail(field(formData, "email"))
  const role = field(formData, "role") as (typeof ROLES)[number]
  const note = field(formData, "note")
  const verify = formData.get("verify") === "on"
  if (!isUuid(venueId)) return fail("That venue no longer exists.")
  if (!email) return fail("Enter a valid email address.")
  if (!ROLES.includes(role)) return fail("Pick a role.")
  if (note.length < 5) return fail("Add a note (at least 5 characters) saying how you confirmed this person works for the venue.")

  const admin = createAdminClient()
  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")

  const { data: venue } = await admin.from("venues").select("id, name").eq("id", venueId).maybeSingle()
  if (!venue) return fail("That venue no longer exists.")

  const db = admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any }
  const { data: matches } = await db.rpc("admin_search_people", { p_query: email, p_limit: 5 })
  const existing = ((matches ?? []) as Array<{ user_id: string; email: string | null }>).find((r) => r.email?.toLowerCase() === email) ?? null

  let userId: string
  let inviteLink: string | null = null
  if (existing) {
    userId = existing.user_id
  } else {
    const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email })
    const hashed = data?.properties?.hashed_token
    if (error || !hashed || !data.user) return fail(`Couldn't create the account: ${error?.message ?? "unknown error"}`)
    userId = data.user.id
    const params = new URLSearchParams({ token_hash: hashed, type: "invite", next: `/reset-password` })
    inviteLink = buildTicketivPublicUrl(`/auth/confirm?${params}`)
  }

  const { data: result, error } = await supabase.rpc("fn_admin_assign_venue_member", {
    p_venue_id: venueId,
    p_user_id: userId,
    p_role: role,
    p_note: note,
    p_verify: verify,
  })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)

  const workspaceUrl = buildTicketivPublicUrl(`/manage/venues/${venueId}`)
  const signInUrl = buildTicketivPublicUrl(`/login?next=${encodeURIComponent(`/manage/venues/${venueId}`)}`)
  const roleLabel = ROLE_LABEL[role]
  const sent = await sendEmail({
    to: email,
    subject: `You can now manage ${venue.name} on Ticketiv`,
    text: inviteLink
      ? `Ticketiv has made you the ${roleLabel} of ${venue.name}. Choose your password with this link (it works once):\n\n${inviteLink}\n\nThen open your venue dashboard to manage bookings, availability and booking requests:\n${workspaceUrl}`
      : `Ticketiv has made you the ${roleLabel} of ${venue.name}. Sign in with your usual Ticketiv email and password to manage bookings, availability and booking requests:\n\n${signInUrl}`,
    html: inviteLink
      ? `<p>Ticketiv has made you the ${roleLabel} of <strong>${escapeHtml(venue.name)}</strong>.</p><p><a href="${inviteLink}">Choose your password</a> (the link works once).</p><p>Then open your <a href="${workspaceUrl}">venue dashboard</a> to manage bookings, availability and booking requests.</p>`
      : `<p>Ticketiv has made you the ${roleLabel} of <strong>${escapeHtml(venue.name)}</strong>.</p><p><a href="${signInUrl}">Sign in</a> with your usual Ticketiv email and password to manage bookings, availability and booking requests.</p>`,
  })

  revalidatePath("/super-admin/venues")
  revalidatePath(`/manage/venues/${venueId}`)
  const demoted = (result as { demoted_owner?: string | null } | null)?.demoted_owner
  const tail = demoted ? " The previous owner is now a manager." : ""
  if (sent.status !== "sent") {
    return fail(
      `Access granted, but the email couldn't be sent.${tail} ${inviteLink ? "Use \"Send set-password link\" from the person's page in People once email works." : "Tell them to sign in at " + signInUrl}`,
    )
  }
  return done(`${email} is now ${roleLabel === "owner" ? "the owner" : `a ${roleLabel}`} of ${venue.name}. ${inviteLink ? "We emailed them a link to set their password." : "We emailed them to sign in."}${tail}`)
}

export async function removeVenueAdminAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("manage_venue_access"))) return NOT_ALLOWED
  const venueId = field(formData, "venueId")
  const userId = field(formData, "userId")
  const note = field(formData, "note")
  if (!isUuid(venueId) || !isUuid(userId)) return fail("That access no longer exists.")
  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_admin_remove_venue_member", { p_venue_id: venueId, p_user_id: userId, p_note: note })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)
  revalidatePath("/super-admin/venues")
  return done("Access removed.")
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)
}
