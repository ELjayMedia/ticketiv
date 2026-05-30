"use server"

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
