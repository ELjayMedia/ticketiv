"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

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
