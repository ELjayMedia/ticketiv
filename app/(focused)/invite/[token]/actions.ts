"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface AcceptResult {
  ok: boolean
  redirectTo?: string
  error?: string
}

/**
 * Accept a membership invite for the CURRENTLY logged-in user. Must be invoked
 * from a user gesture (POST) — never on GET — so link-preview bots can't consume
 * single-use tokens.
 */
export async function acceptInviteAction(token: string): Promise<AcceptResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Please sign in to accept this invite." }

  const { data, error } = await supabase.rpc("fn_accept_membership_invite", { p_token: token })
  if (error) {
    const m = error.message || ""
    const friendly = /expired/.test(m)
      ? "This invite has expired."
      : /revoked/.test(m)
        ? "This invite has been revoked."
        : /already used/.test(m)
          ? "This invite has already been used."
          : /not found/.test(m)
            ? "This invite link is invalid."
            : "Could not accept this invite."
    return { ok: false, error: friendly }
  }

  const ctx = (data ?? {}) as { kind?: string; org_id?: string; event_id?: string | null }
  const redirectTo =
    ctx.kind === "event_staff" ? "/scan" : ctx.org_id ? `/orgs/${ctx.org_id}/dashboard` : "/me"
  return { ok: true, redirectTo }
}
