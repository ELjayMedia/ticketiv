"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function duplicateEvent(
  orgId: string,
  eventId: string,
): Promise<{ ok: boolean; newEventId?: string; error?: string }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not authenticated" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { data, error } = await (supabase.rpc as any)("fn_duplicate_event", {
    p_event_id: eventId,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/orgs/${orgId}/events`)
  return { ok: true, newEventId: (data as any)?.event_id }
}
