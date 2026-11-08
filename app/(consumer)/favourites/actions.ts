"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function toggleFavourite(
  eventId: string,
  save: boolean,
): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(eventId)) return { ok: false, error: "Event not found" }
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

  if (error) {
    console.error("[favourites] toggle:", error)
    return { ok: false, error: "Could not update favourites right now" }
  }
  revalidatePath("/favourites")
  return { ok: true }
}
