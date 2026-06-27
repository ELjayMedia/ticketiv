"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface CreateInviteResult {
  ok: boolean
  token?: string
  error?: string
}

/**
 * Create a token-based org membership invite. Authorization (org admin) is
 * enforced inside the SECURITY DEFINER RPC. Returns the raw token so the caller
 * can build a shareable link; delivery (WhatsApp/SMS/email) is TICK-180.
 */
export async function createOrgInviteAction(input: {
  orgId: string
  role: "organizer_admin" | "organizer_staff" | "finance"
  email?: string | null
}): Promise<CreateInviteResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const { data, error } = await supabase.rpc("fn_create_membership_invite", {
    p_org_id: input.orgId,
    p_kind: "org_member",
    p_role: input.role,
    p_invited_email: input.email?.trim() ? input.email.trim() : undefined,
  })

  if (error) {
    const forbidden = /forbidden/.test(error.message || "")
    return {
      ok: false,
      error: forbidden
        ? "You don't have permission to invite members to this organisation."
        : "Could not create the invite. Please try again.",
    }
  }

  const invite = data as { token: string }
  return { ok: true, token: invite.token }
}
