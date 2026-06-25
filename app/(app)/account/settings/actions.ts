"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ActionResult {
  ok: boolean
  error?: string
}

const AVATAR_BUCKET = "avatars"
const MAX_AVATAR_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
}

/** Profile photo — upload to the avatars bucket and persist the public URL. */
export async function updateAvatarAction(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const file = formData.get("avatar")
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose an image to upload." }
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." }
  }
  const ext = ALLOWED_AVATAR_TYPES[file.type]
  if (!ext) {
    return { ok: false, error: "Use a JPG, PNG, WebP or GIF image." }
  }

  const path = `${user.id}/avatar-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type })

  if (uploadError) {
    console.error("[account-settings] avatar upload:", uploadError)
    return { ok: false, error: "Could not upload that image." }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { error } = await supabase.rpc("fn_set_my_avatar_url", { p_url: publicUrl })
  if (error) {
    console.error("[account-settings] set avatar url:", error)
    return { ok: false, error: "Could not save your photo." }
  }

  revalidatePath("/account/settings")
  revalidatePath("/me")
  revalidatePath("/profile")
  return { ok: true, url: publicUrl }
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
  revalidatePath("/me/reminders")
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
