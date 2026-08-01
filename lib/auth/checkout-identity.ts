import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"

// TICK-76 — guest checkout identity.
//
// If the buyer arrives without a session, mint an anonymous Supabase user so
// `orders.buyer_id` always references a real `auth.uid()`. This preserves the
// existing RLS model, the ownership chain, and `My Tickets` — no schema or
// policy change.
//
// Anonymous Sign-Ins must be enabled in the Supabase project's Auth settings
// for this to work. When disabled, the helper returns null and the caller
// surfaces a sign-in prompt (existing behaviour).

export interface CheckoutIdentity {
  userId: string
  email: string | null
  isAnonymous: boolean
}

export async function ensureCheckoutIdentity(
  supabase = createServerSupabaseClient(),
): Promise<CheckoutIdentity | null> {
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    return {
      userId: user.id,
      email: user.email ?? null,
      // Supabase exposes is_anonymous on the user object; cast for older types.
      isAnonymous: Boolean((user as { is_anonymous?: boolean }).is_anonymous),
    }
  }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error || !data.user) {
    console.error("[checkout-identity] anonymous sign-in failed", error)
    return null
  }
  return { userId: data.user.id, email: null, isAnonymous: true }
}
