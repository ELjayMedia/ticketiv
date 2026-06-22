"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ActionResult {
  ok: boolean
  error?: string
}

/** Profile section — name, surname, display name, phone. */
export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const displayName = String(formData.get("displayName") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const surname = String(formData.get("surname") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()

  const { error } = await supabase.rpc("fn_update_my_profile", {
    p_display_name: displayName,
    p_name: name,
    p_surname: surname,
    p_phone: phone,
  })

  if (error) {
    console.error("[account-settings] profile:", error)
    return { ok: false, error: "Could not save your profile." }
  }

  revalidatePath("/account/settings")
  revalidatePath("/me")
  return { ok: true }
}

/** Notifications section — per-channel opt-in toggles, persisted via RPC. */
export async function updateNotificationPrefsAction(formData: FormData): Promise<ActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const asBool = (key: string) => formData.get(key) === "true"

  const { error } = await supabase.rpc("fn_update_my_notification_preferences", {
    p_email_opt_in: asBool("emailOptIn"),
    p_sms_opt_in: asBool("smsOptIn"),
    p_push_opt_in: asBool("pushOptIn"),
    p_in_app_opt_in: asBool("inAppOptIn"),
  })

  if (error) {
    console.error("[account-settings] notifications:", error)
    return { ok: false, error: "Could not save your notification preferences." }
  }

  revalidatePath("/account/settings")
  revalidatePath("/me")
  return { ok: true }
}

/** Security section — change password via Supabase Auth. */
export async function updatePasswordAction(formData: FormData): Promise<ActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const password = String(formData.get("password") ?? "")
  const confirm = String(formData.get("confirm") ?? "")

  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." }
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." }
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    console.error("[account-settings] password:", error)
    return { ok: false, error: error.message || "Could not update your password." }
  }

  return { ok: true }
}
