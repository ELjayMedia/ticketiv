"use server"

// TICK-214: persist / remove a buyer's Web Push subscription via the
// SECURITY DEFINER RPCs (fn_store_push_subscription / fn_remove_push_subscription).
// The client (lib/push/client.ts) captures the subscription from the browser
// Push API and hands it here so the write goes through an RPC, never a raw
// client-side insert.

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string
}

export async function storePushSubscription(
  sub: PushSubscriptionInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Service unavailable" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Sign in to enable push notifications." }

  const { error } = await (supabase.rpc as any)("fn_store_push_subscription", {
    p_endpoint: sub.endpoint,
    p_p256dh: sub.p256dh,
    p_auth: sub.auth,
    p_user_agent: sub.userAgent,
  })

  if (error) {
    console.error("[push] store subscription:", error)
    return { ok: false, error: "Could not save your subscription." }
  }

  return { ok: true }
}

export async function removePushSubscription(
  endpoint: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Service unavailable" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const { error } = await (supabase.rpc as any)("fn_remove_push_subscription", {
    p_endpoint: endpoint,
  })

  if (error) {
    console.error("[push] remove subscription:", error)
    return { ok: false, error: "Could not remove your subscription." }
  }

  return { ok: true }
}
