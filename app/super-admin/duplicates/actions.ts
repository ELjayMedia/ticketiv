"use server"

import { revalidatePath } from "next/cache"

import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, type ConsoleActionResult } from "@/lib/super-admin/console"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })

/**
 * Support's three choices on a duplicate-event request. The RPC re-checks the
 * admin's role (app.can_platform_mutate) and writes the audit row.
 */
export async function routeDuplicateRequestAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  const context = await adminForAction("route_duplicate_request")
  if (!context) return fail("Your role can't do this. Ask the owner, or leave a note instead.")

  const requestId = String(formData.get("requestId") ?? "")
  const action = String(formData.get("intent") ?? "")
  const note = String(formData.get("note") ?? "").trim()
  if (!isUuid(requestId)) return fail("That request no longer exists.")
  if (!["forward", "approve", "decline"].includes(action)) return fail("Choose what to do with the request.")
  if (action === "decline" && note.length < 5) return fail("Say why you're declining. The organiser sees this.")
  if (note.length > 2000) return fail("Keep the note under 2,000 characters.")

  const supabase = await createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await (supabase.rpc as any)("fn_admin_route_duplicate_request", {
    p_request_id: requestId,
    p_action: action,
    p_note: note || null,
  })
  if (error) {
    if (String(error.message).includes("already_handled")) return fail("Someone already handled this request (or it went to the organiser automatically).")
    if (error.code === "42501") return fail("Your account can't change this.")
    return fail("Couldn't save that. Try again.")
  }

  revalidatePath("/super-admin/duplicates")
  revalidatePath("/super-admin")
  return {
    status: "done",
    message:
      action === "forward"
        ? "Sent to the original organiser. Both sides will be notified when they decide."
        : action === "approve"
          ? "Approved. The organiser can publish now."
          : "Declined. The organiser has been told why.",
  }
}
