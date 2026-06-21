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

  const { error } = await (supabase.rpc as any)("fn_toggle_favourite", {
    p_event_id: eventId,
    p_save: save,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/favourites")
  return { ok: true }
}
