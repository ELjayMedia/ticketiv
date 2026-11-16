"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type DecideResult = { status: "idle" | "done" | "error"; message?: string }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The original organiser approves or declines another organiser's request. */
export async function decideDuplicateRequestAction(_prev: DecideResult, formData: FormData): Promise<DecideResult> {
  const orgId = String(formData.get("orgId") ?? "")
  const requestId = String(formData.get("requestId") ?? "")
  const decision = String(formData.get("decision") ?? "")
  const note = String(formData.get("note") ?? "").trim()
  if (!UUID_RE.test(orgId) || !UUID_RE.test(requestId)) return { status: "error", message: "That request no longer exists." }
  if (decision !== "approve" && decision !== "decline") return { status: "error", message: "Choose approve or decline." }
  if (note.length > 2000) return { status: "error", message: "Keep your note under 2,000 characters." }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return { status: "error", message: "Sign in again and retry." }
  const { error } = await (supabase.rpc as any)("fn_decide_duplicate_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note || null,
  })
  if (error) {
    if (String(error.message).includes("already_handled")) return { status: "error", message: "This request was already answered or withdrawn." }
    if (error.code === "42501") return { status: "error", message: "Only organisers who manage events here can answer this." }
    return { status: "error", message: "Couldn't save your answer. Try again." }
  }
  revalidatePath(`/orgs/${orgId}/permission-requests`)
  return {
    status: "done",
    message: decision === "approve" ? "Approved. They can now publish their event." : "Declined. They've been told.",
  }
}
