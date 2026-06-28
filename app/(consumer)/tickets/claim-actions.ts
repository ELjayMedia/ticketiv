"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

// TICK-78 — "Save my tickets" claim flow.
//
// Anonymous buyer adds an email -> Supabase sends a confirmation magic link
// -> existing /auth/confirm route verifies and sets the email on the SAME
// anon user, so `auth.uid()` (and therefore every order they own, every
// RLS-scoped /tickets read, every notifications row) stays attached. No
// data migration. Once confirmed, `is_anonymous` flips false and the user
// can sign back in by email from any device.

export interface ClaimEmailResult {
  ok: boolean
  message: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function requestEmailClaimAction(email: string): Promise<ClaimEmailResult> {
  const trimmed = email.trim()
  if (!EMAIL_RE.test(trimmed)) {
    return { ok: false, message: "Enter a valid email address." }
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, message: "Sign-in is unavailable right now." }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Open this page after starting checkout — we could not find your session." }
  }
  if (!(user as { is_anonymous?: boolean }).is_anonymous) {
    return { ok: true, message: "This account already has an email saved." }
  }

  const { error } = await supabase.auth.updateUser(
    { email: trimmed },
    { emailRedirectTo: "/auth/confirm?next=/tickets" },
  )
  if (error) {
    console.error("[claim] updateUser failed", error)
    return {
      ok: false,
      message: "We could not send the confirmation. If you already have a Ticketiv account with that email, sign in instead.",
    }
  }

  return {
    ok: true,
    message: "Check your inbox — tap the link to save your tickets to this email.",
  }
}

// TICK-271 — cross-account claim. When a signed-in (verified) user previously
// bought as a guest under a different anonymous session, re-attach those orders
// to their account by matching the verified email/phone. Idempotent.
export interface ClaimOrdersResult {
  ok: boolean
  claimed: number
  message: string
}

export async function claimGuestOrdersAction(): Promise<ClaimOrdersResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, claimed: 0, message: "Sign-in is unavailable right now." }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, claimed: 0, message: "Please sign in first." }

  const { data, error } = await supabase.rpc("fn_claim_guest_orders")
  if (error) {
    console.error("[claim] guest orders failed", error)
    return { ok: false, claimed: 0, message: "We could not add your past orders. Please try again." }
  }

  const claimed = typeof data === "number" ? data : 0
  revalidatePath("/tickets")
  revalidatePath("/me")
  return {
    ok: true,
    claimed,
    message:
      claimed > 0
        ? `Added ${claimed} past order${claimed === 1 ? "" : "s"} to your account.`
        : "No past orders found to add.",
  }
}
