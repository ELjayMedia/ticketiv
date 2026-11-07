"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import { requireEventManager } from "@/lib/organizer/access"
import { eventTimeZone } from "@ticketiv/shared"

import { sendPendingCompanionPushes } from "@/lib/notifications/companion-push"
import { guideFromForm } from "@/lib/organizer/guide-form"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface GuideActionState {
  ok: boolean
  message: string | null
  errors?: string[]
}

// The RPCs are newer than the generated Database types.
type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => any; from: (t: string) => any }

async function context(orgId: string, eventId: string) {
  await requireEventManager(orgId, eventId)
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not signed in")
  return supabase as unknown as RpcClient
}

function friendly(error: { message?: string; code?: string } | null): string {
  if (!error) return "Something went wrong. Try again."
  if (error.code === "42501") return "Only the event's owner or admins can change this."
  // Our RPCs raise plain-language messages for validation (22023).
  if (error.code === "22023" && error.message) return error.message
  return "Couldn't save. Try again in a moment."
}

/** Save the whole Attendee guide. Calls fn_save_event_guide (organiser-checked). */
export async function saveGuideAction(_prev: GuideActionState, form: FormData): Promise<GuideActionState> {
  const orgId = String(form.get("orgId") ?? "")
  const eventId = String(form.get("eventId") ?? "")
  const db = await context(orgId, eventId)

  const { data: event } = await db.from("events").select("starts_at, tz, venues(tz)").eq("id", eventId).eq("org_id", orgId).maybeSingle()
  if (!event) return { ok: false, message: "Event not found." }

  const { guide, errors } = guideFromForm(form, event.starts_at, eventTimeZone(event.tz, event.venues?.tz))
  if (errors.length) return { ok: false, message: "Fix these and save again.", errors }

  const { error } = await db.rpc("fn_save_event_guide", { p_event_id: eventId, p_guide: guide })
  if (error) {
    console.error("[guide] save:", error)
    return { ok: false, message: friendly(error) }
  }

  revalidatePath(`/orgs/${orgId}/events/${eventId}/guide`)
  revalidatePath(`/tickets/event/${eventId}`)
  return { ok: true, message: "Guide saved. Ticket holders see it now." }
}

/** Post an official update; optionally notify every ticket holder in the app. */
export async function postUpdateAction(_prev: GuideActionState, form: FormData): Promise<GuideActionState> {
  const orgId = String(form.get("orgId") ?? "")
  const eventId = String(form.get("eventId") ?? "")
  const title = String(form.get("title") ?? "").trim()
  const body = String(form.get("body") ?? "").trim()
  const notify = form.get("notify") === "on"
  if (!title) return { ok: false, message: "Give the update a short title." }

  const db = await context(orgId, eventId)
  const { error } = await db.rpc("fn_post_event_update", { p_event_id: eventId, p_title: title, p_body: body || null, p_notify: notify })
  if (error) {
    console.error("[guide] post update:", error)
    return { ok: false, message: friendly(error) }
  }

  revalidatePath(`/orgs/${orgId}/events/${eventId}/guide`)
  revalidatePath(`/tickets/event/${eventId}`)
  // Urgent notices go to opted-in devices now, not at the next hourly run.
  if (notify) {
    after(() =>
      sendPendingCompanionPushes({ sinceMs: 10 * 60 * 1000, types: ["event_update"] }).catch((err) =>
        console.error("[guide] update push:", err),
      ),
    )
  }
  return { ok: true, message: notify ? "Posted, and ticket holders were notified." : "Posted to the event guide." }
}

/** Hide an update from ticket holders. Kept for the team and admins, with the reason. */
export async function hideUpdateAction(_prev: GuideActionState, form: FormData): Promise<GuideActionState> {
  const orgId = String(form.get("orgId") ?? "")
  const eventId = String(form.get("eventId") ?? "")
  const updateId = String(form.get("updateId") ?? "")
  const reason = String(form.get("reason") ?? "").trim()
  if (reason.length < 3) return { ok: false, message: "Say why you're hiding it." }

  const db = await context(orgId, eventId)
  const { error } = await db.rpc("fn_hide_event_update", { p_update_id: updateId, p_reason: reason })
  if (error) {
    console.error("[guide] hide update:", error)
    return { ok: false, message: friendly(error) }
  }

  revalidatePath(`/orgs/${orgId}/events/${eventId}/guide`)
  revalidatePath(`/tickets/event/${eventId}`)
  return { ok: true, message: "Hidden from ticket holders." }
}

/** Add a highlight photo already uploaded through /api/uploads. */
export async function addHighlightAction(orgId: string, eventId: string, imageUrl: string, caption: string): Promise<GuideActionState> {
  const db = await context(orgId, eventId)
  const { error } = await db.rpc("fn_add_event_highlight", { p_event_id: eventId, p_image_url: imageUrl, p_caption: caption.trim() || null })
  if (error) {
    console.error("[guide] add highlight:", error)
    return { ok: false, message: friendly(error) }
  }
  revalidatePath(`/orgs/${orgId}/events/${eventId}/guide`)
  revalidatePath(`/tickets/event/${eventId}`)
  return { ok: true, message: "Added. Attendees see it in their event memory." }
}

export async function removeHighlightAction(orgId: string, eventId: string, highlightId: string): Promise<GuideActionState> {
  const db = await context(orgId, eventId)
  const { error } = await db.rpc("fn_remove_event_highlight", { p_highlight_id: highlightId })
  if (error) {
    console.error("[guide] remove highlight:", error)
    return { ok: false, message: friendly(error) }
  }
  revalidatePath(`/orgs/${orgId}/events/${eventId}/guide`)
  revalidatePath(`/tickets/event/${eventId}`)
  return { ok: true, message: "Removed." }
}
