"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { isMissingEnvironmentVariableError } from "@/lib/env"

export interface ActionResult {
  ok: boolean
  error?: string
}

export interface DeleteAccountResult extends ActionResult {
  deleted?: boolean
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

/** Danger zone — permanently delete the signed-in user's account. */
export async function deleteAccountAction(formData: FormData): Promise<DeleteAccountResult> {
  const confirmation = String(formData.get("confirmation") ?? "").trim()
  if (confirmation !== "DELETE") {
    return { ok: false, error: "Type DELETE to confirm." }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("[account-settings] deletion user lookup:", userError)
  }

  if (!user) return { ok: false, error: "Not signed in" }

  const { data: status, error: statusError } = await supabase.rpc("fn_get_my_account_deletion_status")
  if (statusError) {
    console.error("[account-settings] deletion status:", statusError)
    return { ok: false, error: "Could not check whether this account can be deleted." }
  }

  const statusRecord = status && typeof status === "object" && !Array.isArray(status) ? status as Record<string, unknown> : {}
  if (statusRecord.canDelete !== true) {
    const blockers = Array.isArray(statusRecord.blockers) ? statusRecord.blockers : []
    const firstBlocker = blockers
      .map((item) => item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : null)
      .find(Boolean)
    return {
      ok: false,
      error: typeof firstBlocker?.message === "string"
        ? firstBlocker.message
        : "Resolve account deletion blockers first.",
    }
  }

  try {
    const admin = createAdminClient()
    const { error: signOutError } = await supabase.auth.signOut({ scope: "global" })
    if (signOutError) {
      console.error("[account-settings] deletion sign out:", signOutError)
      return { ok: false, error: "Could not sign out active sessions before deletion." }
    }

    const { error } = await admin.rpc("fn_delete_account_for_user", { p_user_id: user.id })

    if (error) {
      console.error("[account-settings] delete account:", error)
      return { ok: false, error: "Could not delete the account. Please contact support." }
    }
  } catch (error) {
    console.error("[account-settings] delete account:", error)
    return {
      ok: false,
      error: isMissingEnvironmentVariableError(error)
        ? "Account deletion is not configured for this environment."
        : "Could not delete the account. Please contact support.",
    }
  }

  revalidatePath("/", "layout")
  return { ok: true, deleted: true }
}
