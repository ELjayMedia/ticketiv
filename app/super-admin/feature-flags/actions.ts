"use server"

import { revalidatePath } from "next/cache"

import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, type ConsoleActionResult } from "@/lib/super-admin/console"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// Command centre → Feature flags. Each card's switch, and excluding an
// organisation or event from a feature. Writes go through fn_admin_* RPCs with
// the admin's own session; they re-check the admin's tier and write the audit row.

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })
const done = (message: string): ConsoleActionResult => ({ status: "done", message })
const NOT_ALLOWED_MESSAGE = "Read-only admins can't change feature flags."
const KEY = /^[a-z][a-z0-9_]{1,63}$/

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

function rpcProblem(error: { message?: string } | null): string | null {
  if (!error) return null
  const m = String(error.message ?? "")
  if (m.includes("forbidden")) return NOT_ALLOWED_MESSAGE
  if (m.includes("unknown_flag")) return "That flag no longer exists."
  if (m.includes("already_excluded")) return "That's already excluded from this feature."
  if (m.includes("unknown_organisation")) return "That organisation no longer exists."
  if (m.includes("unknown_event")) return "That event no longer exists."
  if (m.includes("reason_too_long")) return "Keep the reason under 500 characters."
  if (m.includes("not_found")) return "That exclusion was already removed."
  console.error("[feature-flags] rpc failed", m)
  return "Couldn't save that. Try again."
}

function refresh() {
  revalidatePath("/super-admin/feature-flags")
}

export async function setFlagAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("manage_feature_flags"))) return fail(NOT_ALLOWED_MESSAGE)
  const key = field(formData, "key")
  if (!KEY.test(key)) return fail("Unknown flag.")
  const enabled = field(formData, "enabled") === "true"
  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_admin_set_platform_flag", { p_key: key, p_enabled: enabled })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)
  refresh()
  return done(enabled ? "Switched on for everyone, except anything excluded below." : "Switched off for everyone.")
}

export async function addExclusionAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("manage_feature_flags"))) return fail(NOT_ALLOWED_MESSAGE)
  const key = field(formData, "key")
  if (!KEY.test(key)) return fail("Unknown flag.")
  const orgId = field(formData, "orgId")
  const eventId = field(formData, "eventId")
  const reason = field(formData, "reason")
  if (!orgId && !eventId) return fail("Choose an organisation, or an event.")
  if ((orgId && !isUuid(orgId)) || (eventId && !isUuid(eventId))) return fail("Choose an organisation or event from the list.")
  if (reason.length > 500) return fail("Keep the reason under 500 characters.")

  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  // An event choice wins: "this one event". With no event, the whole organisation.
  const { error } = await supabase.rpc("fn_admin_add_flag_exclusion", {
    p_key: key,
    p_org_id: eventId ? null : orgId,
    p_event_id: eventId || null,
    p_reason: reason || null,
  })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)
  refresh()
  return done(eventId ? "That event is excluded." : "That organisation and all its events are excluded.")
}

export async function removeExclusionAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("manage_feature_flags"))) return fail(NOT_ALLOWED_MESSAGE)
  const id = field(formData, "id")
  if (!isUuid(id)) return fail("Unknown exclusion.")
  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_admin_remove_flag_exclusion", { p_id: id })
  const problem = rpcProblem(error)
  if (problem) return fail(problem)
  refresh()
  return done("Exclusion removed.")
}
