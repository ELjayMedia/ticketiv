"use server"

import { revalidatePath } from "next/cache"

import { adminForAction } from "@/lib/super-admin/auth"
import { isUuid, type ConsoleActionResult } from "@/lib/super-admin/console"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { sponsorErrorMessage } from "@/lib/sponsors"

// Command centre → Sponsors. The shared sponsor directory is the owner's to
// edit: rename, change or remove a logo, change the website. Organisers can
// only add sponsors and fill in a missing logo or website.

const fail = (message: string): ConsoleActionResult => ({ status: "error", message })
const done = (message: string): ConsoleActionResult => ({ status: "done", message })

function field(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === "string" ? value.trim() : ""
}

export async function updateSponsorAction(_prev: ConsoleActionResult, formData: FormData): Promise<ConsoleActionResult> {
  if (!(await adminForAction("manage_sponsors"))) return fail("Only the Ticketiv owner can edit sponsors.")
  const id = field(formData, "id")
  if (!isUuid(id)) return fail("That sponsor no longer exists.")
  const supabase = createServerSupabaseClient()
  if (!supabase) return fail("Sign in again and retry.")
  const { error } = await supabase.rpc("fn_admin_update_sponsor", {
    p_sponsor_id: id,
    p_name: field(formData, "name"),
    p_logo_url: field(formData, "logoUrl") || null,
    p_website_url: field(formData, "websiteUrl") || null,
    p_clear_logo: formData.get("clearLogo") === "on",
  })
  if (error) return fail(sponsorErrorMessage(error))
  revalidatePath("/super-admin/sponsors")
  return done("Saved. Every event using this sponsor shows the change.")
}
