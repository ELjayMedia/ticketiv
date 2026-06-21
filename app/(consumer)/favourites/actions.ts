"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function toggleFavourite(
  eventId: string,
  save: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not authenticated" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  if (save) {
    const { error } = await supabase
      .from("event_favourites")
      .upsert({ event_id: eventId, user_id: user.id }, { onConflict: "event_id,user_id" })
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from("event_favourites")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", user.id)
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath("/favourites")
  return { ok: true }
}
