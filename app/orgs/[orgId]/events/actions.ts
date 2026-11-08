"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { requireEventManager, requireOrgManager } from "@/lib/organizer/access"

export async function bulkTransitionEventStatus(
  orgId: string,
  eventIds: string[],
  newStatus: "published" | "archived",
): Promise<{ ok: boolean; error?: string; succeeded: number; failed: number }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available", succeeded: 0, failed: 0 }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated", succeeded: 0, failed: 0 }

  let succeeded = 0,
    failed = 0
  for (const eventId of eventIds) {
    const result = await transitionEventStatus(orgId, eventId, newStatus)
    if (result.ok) succeeded++
    else failed++
  }
  revalidatePath(`/orgs/${orgId}/events`)
  return { ok: succeeded > 0, succeeded, failed }
}

export async function bulkDeleteEvents(
  orgId: string,
  eventIds: string[],
): Promise<{ ok: boolean; error?: string; succeeded: number; failed: number }> {
  await requireOrgManager(orgId)
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available", succeeded: 0, failed: 0 }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated", succeeded: 0, failed: 0 }

  let succeeded = 0,
    failed = 0
  for (const eventId of eventIds) {
    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("org_id", orgId)
      .in("status", ["draft", "archived"])
    if (error) failed++
    else succeeded++
  }
  revalidatePath(`/orgs/${orgId}/events`)
  return { ok: succeeded > 0, succeeded, failed }
}

export async function duplicateEvent(
  orgId: string,
  eventId: string,
): Promise<{ ok: boolean; newEventId?: string; error?: string }> {
  await requireEventManager(orgId, eventId)
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

export async function transitionEventStatus(
  orgId: string,
  eventId: string,
  newStatus: "paused" | "published" | "archived" | "cancelled",
): Promise<{ ok: boolean; activeHolders?: number; error?: string }> {
  await requireEventManager(orgId, eventId)
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not authenticated" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not authenticated" }

  const { data, error } = await (supabase.rpc as any)("fn_transition_event_status", {
    p_event_id: eventId,
    p_new_status: newStatus,
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath(`/orgs/${orgId}/events`)
  revalidatePath(`/orgs/${orgId}/events/${eventId}`)
  return { ok: true, activeHolders: (data as any)?.active_holders }
}
