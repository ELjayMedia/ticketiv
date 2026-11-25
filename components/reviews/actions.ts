"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export type ReviewAction = "submit" | "report" | "reply" | "moderate"
export async function saveReview(action: ReviewAction, target: string, slug: string, _previous: string, form: FormData) {
  const client = createServerSupabaseClient()
  if (!client || !(await client.auth.getUser()).data.user) return "Sign in to continue."
  const field = (key: string) => String(form.get(key) ?? "").trim()
  // Each RPC authorizes the actor and target together inside the database.
  let result
  switch (action) {
    case "submit":
      result = await client.rpc("fn_submit_event_review", { p_event_id: target, p_rating: Number(field("rating")), p_body: field("body"), p_tags: form.getAll("tag").map(String) })
      break
    case "reply":
      result = await client.rpc("fn_reply_event_review", { p_review_id: target, p_reply: field("reply") })
      break
    case "report":
      result = await client.rpc("fn_report_event_review", { p_review_id: target, p_reason: field("reason") })
      break
    case "moderate":
      result = await client.rpc("fn_moderate_event_review", { p_review_id: target, p_decision: field("decision") })
      break
    default:
      return "Unknown action."
  }
  if (result.error) {
    const messages: Record<string, string> = {
      review_language: "Please revise the language in your message.",
      review_attendees_only: "Only checked-in attendees can review this event.",
      review_closed: "The review window has closed.",
      cannot_report_own: "You can only report someone else’s review.",
    }
    return messages[result.error.message] ?? "Could not save this change. Refresh and try again."
  }
  if (slug) revalidatePath(`/events/${encodeURIComponent(slug)}/reviews`)
  revalidatePath("/super-admin/reviews")
  return "Saved."
}
