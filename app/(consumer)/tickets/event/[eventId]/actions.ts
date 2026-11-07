"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface MemoryActionState {
  ok: boolean
  message: string | null
}

// The RPCs are newer than the generated Database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => any }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function friendly(error: { code?: string; message?: string }): string {
  if (error.code === "22023" || error.code === "42501") return error.message ?? "That didn't work."
  if (error.code === "28000") return "Sign in again to continue."
  return "Couldn't save. Try again in a moment."
}

/** Private rating: only the organiser sees it, without your name. */
export async function submitFeedbackAction(_prev: MemoryActionState, form: FormData): Promise<MemoryActionState> {
  const eventId = String(form.get("eventId") ?? "")
  const rating = Number(form.get("rating"))
  const comment = String(form.get("comment") ?? "").trim()
  if (!UUID.test(eventId)) return { ok: false, message: "Event not found." }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, message: "Choose 1 to 5 stars." }

  const supabase = createServerSupabaseClient() as unknown as Rpc | null
  if (!supabase) return { ok: false, message: "Sign in again to continue." }
  const { error } = await supabase.rpc("fn_submit_event_feedback", { p_event_id: eventId, p_rating: rating, p_comment: comment || null })
  if (error) {
    console.error("[memory] feedback:", error)
    return { ok: false, message: friendly(error) }
  }
  revalidatePath(`/tickets/event/${eventId}`)
  return { ok: true, message: "Thanks. Only the organiser sees this, without your name." }
}

/** "Hear about their next event": follow or unfollow the organiser. */
export async function setOrgFollowAction(eventId: string, orgId: string, follow: boolean): Promise<MemoryActionState> {
  if (!UUID.test(orgId) || !UUID.test(eventId)) return { ok: false, message: "Organiser not found." }
  const supabase = createServerSupabaseClient() as unknown as Rpc | null
  if (!supabase) return { ok: false, message: "Sign in again to continue." }
  const { error } = await supabase.rpc("fn_set_org_follow", { p_org_id: orgId, p_follow: follow })
  if (error) {
    console.error("[memory] follow:", error)
    return { ok: false, message: friendly(error) }
  }
  revalidatePath(`/tickets/event/${eventId}`)
  return { ok: true, message: follow ? "You'll hear when they announce their next event." : "You won't get their announcements." }
}
