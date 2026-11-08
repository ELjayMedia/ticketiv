"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const NOTIFICATION_TYPE = /^[a-z][a-z0-9_]{0,63}$/

export async function markNotificationRead(formData: FormData) {
  const notificationId = String(formData.get("notificationId") ?? "").trim()
  if (!notificationId) return

  const supabase = createServerSupabaseClient()
  if (!supabase) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) console.error("[notifications] mark read:", error)

  revalidatePath("/notifications")
  revalidatePath("/me")
}

export async function toggleNotificationMute(formData: FormData) {
  const type = String(formData.get("type") ?? "").trim()
  if (!NOTIFICATION_TYPE.test(type)) return { error: "Invalid notification type" }
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Not available" }
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: "Sign in to update notification settings" }
  const { error } = await (supabase.rpc as any)('fn_toggle_notification_mute', { p_type: type })
  if (error) {
    console.error("[notifications] toggle mute:", error)
    return { error: "Could not update notification settings" }
  }
  revalidatePath("/notifications")
  return { ok: true }
}

export async function markAllNotificationsRead() {
  const supabase = createServerSupabaseClient()
  if (!supabase) return

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) console.error("[notifications] mark all read:", error)

  revalidatePath("/notifications")
  revalidatePath("/me")
}
