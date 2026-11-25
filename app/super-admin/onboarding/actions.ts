"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { sendEmail } from "@/lib/notifications/channels/email"
import { buildTicketivPublicUrl } from "@/lib/public-url"
import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, normalizeEmail, type ConsoleActionResult } from "@/lib/super-admin/console"
import { escapeHtml, findOrInvitePerson } from "@/lib/super-admin/find-or-invite"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Command centre: create an organiser (organisation + owner) or an event (draft
// for an organisation + optional event admin), and assign an event admin later.
// The RPCs re-check super_admin and write the audit rows; this layer only finds
// or invites the person's account and emails them.

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })
const done = (message: string): ConsoleActionResult => ({ status: "done", message })
const NOT_ALLOWED_MESSAGE = "Only the Ticketiv owner can create organisers and events."
const NOT_ALLOWED = fail(NOT_ALLOWED_MESSAGE)

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function rpcProblem(error: { message?: string } | null): string | null {
  if (!error) return null
  const m = String(error.message ?? "")
  if (m.includes("forbidden")) return NOT_ALLOWED_MESSAGE
  if (m.includes("note_required")) return "Add a note (at least 5 characters) saying why. It goes in the audit log."
  if (m.includes("name_required")) return "Enter the organiser's name."
  if (m.includes("name_too_long")) return "Keep the name under 120 characters."
  if (m.includes("title_required")) return "Enter the event's title."
  if (m.includes("title_too_long")) return "Keep the title under 200 characters."
  if (m.includes("currency_invalid")) return "Use a 3-letter currency code like SZL."
  if (m.includes("user_not_found")) return "That account no longer exists."
  if (m.includes("organisation_not_found")) return "That organiser no longer exists."
  if (m.includes("event_not_found")) return "That event no longer exists."
  console.error("[onboarding] rpc failed", m)
  return "Couldn't save that. Try again."
}

async function tell(email: string, inviteLink: string | null, subject: string, what: string, path: string) {
  const url = buildTicketivPublicUrl(path)
  const signIn = buildTicketivPublicUrl(`/login?next=${encodeURIComponent(path)}`)
  return sendEmail({
    to: email,
    subject,
    text: inviteLink
      ? `${what} Choose your password with this link (it works once):\n\n${inviteLink}\n\nThen open it here:\n${url}`
      : `${what} Sign in with your usual Ticketiv email and password:\n\n${signIn}`,
    html: inviteLink
      ? `<p>${escapeHtml(what)}</p><p><a href="${inviteLink}">Choose your password</a> (the link works once), then <a href="${url}">open it here</a>.</p>`
      : `<p>${escapeHtml(what)}</p><p><a href="${signIn}">Sign in</a> with your usual Ticketiv email and password.</p>`,
  })
}

/** New organiser: an organisation and its owner (found or invited by email). */
export async function createOrganizerAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("create_organizers_events"))) return NOT_ALLOWED
  const name = field(formData, "name")
  const email = normalizeEmail(field(formData, "email"))
  const note = field(formData, "note")
  if (name.length < 2) return fail("Enter the organiser's name.")
  if (!email) return fail("Enter the owner's email address.")
  if (note.length < 5) return fail("Add a note (at least 5 characters) saying why. It goes in the audit log.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const person = await findOrInvitePerson(email)
  if ("error" in person) return fail(person.error)

  const { data, error } = await supabase.rpc("fn_admin_create_organization", { p_name: name, p_owner_user_id: person.userId, p_note: note })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)
  const org = data as { id: string; name: string } | null
  if (!org?.id) return fail("Couldn't create the organiser.")

  const sent = await tell(email, person.inviteLink, `${org.name} is set up on Ticketiv`, `Ticketiv has set up ${org.name} and made you its owner.`, `/orgs/${org.id}/dashboard`)
  revalidatePath("/super-admin/organizations")
  if (sent.status !== "sent") {
    return fail(`${org.name} was created with ${email} as owner, but the email couldn't be sent. Send them a set-password link from People.`)
  }
  redirect(`/super-admin/organizations?created=${org.id}`)
}

/** New draft event for an organiser, optionally with an event admin. Opens the event editor. */
export async function createEventAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("create_organizers_events"))) return NOT_ALLOWED
  const orgId = field(formData, "orgId")
  const title = field(formData, "title")
  const email = field(formData, "email") ? normalizeEmail(field(formData, "email")) : null
  const note = field(formData, "note")
  if (!isUuid(orgId)) return fail("Choose an organiser.")
  if (title.length < 2) return fail("Enter the event's title.")
  if (field(formData, "email") && !email) return fail("Enter a valid email address for the event admin, or leave it empty.")
  if (note.length < 5) return fail("Add a note (at least 5 characters) saying why. It goes in the audit log.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  let person: { userId: string; inviteLink: string | null } | null = null
  if (email) {
    const found = await findOrInvitePerson(email)
    if ("error" in found) return fail(found.error)
    person = found
  }

  const { data: eventId, error } = await supabase.rpc("fn_admin_create_event", {
    p_org_id: orgId,
    p_title: title,
    p_note: note,
    p_admin_user_id: person?.userId ?? null,
  })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)
  if (!eventId) return fail("Couldn't create the event.")

  if (email && person) {
    await tell(email, person.inviteLink, `You're the admin of ${title} on Ticketiv`, `Ticketiv has made you the admin of ${title}.`, `/orgs/${orgId}/events/${eventId}/edit`)
  }
  revalidatePath("/super-admin/events")
  redirect(`/orgs/${orgId}/events/${eventId}/edit`)
}

/** Make someone the admin of an existing event. */
export async function assignEventAdminAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("create_organizers_events"))) return NOT_ALLOWED
  const eventId = field(formData, "eventId")
  const email = normalizeEmail(field(formData, "email"))
  const note = field(formData, "note")
  if (!isUuid(eventId)) return fail("That event no longer exists.")
  if (!email) return fail("Enter a valid email address.")
  if (note.length < 5) return fail("Add a note (at least 5 characters) saying why. It goes in the audit log.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { data: event } = await createAdminClient().from("events").select("id, org_id, title").eq("id", eventId).maybeSingle()
  if (!event) return fail("That event no longer exists.")
  const person = await findOrInvitePerson(email)
  if ("error" in person) return fail(person.error)

  const { error } = await supabase.rpc("fn_admin_assign_event_admin", { p_event_id: eventId, p_user_id: person.userId, p_note: note })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)

  const title = event.title ?? "an event"
  const sent = await tell(email, person.inviteLink, `You're the admin of ${title} on Ticketiv`, `Ticketiv has made you the admin of ${title}.`, `/orgs/${event.org_id}/events/${eventId}/edit`)
  revalidatePath(`/super-admin/event/${eventId}`)
  return done(`${email} is now the admin of ${title}.${sent.status === "sent" ? " We emailed them." : " The email couldn't be sent; tell them to sign in."}`)
}
