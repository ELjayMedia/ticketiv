import "server-only"

import { buildTicketivPublicUrl } from "@/lib/public-url"
import { createAdminClient } from "@/lib/supabase/admin"

// Command centre: find a person's Ticketiv account by email, or create one with
// an invite link to choose a password (it works once). Passwords are never set
// or shown. Shared by the organiser / event / venue access tools.

export type FoundPerson = { userId: string; inviteLink: string | null }

export async function findOrInvitePerson(email: string): Promise<FoundPerson | { error: string }> {
  const admin = createAdminClient()
  const db = admin as unknown as { rpc: (fn: string, args: Record<string, unknown>) => any }
  const { data: matches } = await db.rpc("admin_search_people", { p_query: email, p_limit: 5 })
  const existing = ((matches ?? []) as Array<{ user_id: string; email: string | null }>).find((r) => r.email?.toLowerCase() === email) ?? null
  if (existing) return { userId: existing.user_id, inviteLink: null }

  const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email })
  const hashed = data?.properties?.hashed_token
  if (error || !hashed || !data.user) return { error: `Couldn't create the account: ${error?.message ?? "unknown error"}` }
  const params = new URLSearchParams({ token_hash: hashed, type: "invite", next: "/reset-password" })
  return { userId: data.user.id, inviteLink: buildTicketivPublicUrl(`/auth/confirm?${params}`) }
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c)
}
