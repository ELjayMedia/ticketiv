"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

// TICK-54 — Payout account management (organizer side)
// details_encrypted stores a JSON blob — full account number never returned to browser

export async function addPayoutAccountAction(
  orgId: string,
  provider: string,
  accountNumber: string,
  branchCode: string,
  accountName: string,
) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not authenticated")

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error("Not authenticated")

  // Verify caller is org admin
  const adminRoles = new Set(["admin", "organizer", "organizer_owner", "organizer_admin"])
  const { data: member } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", session.user.id)
    .maybeSingle()
  if (!member || !adminRoles.has(String(member.role))) {
    throw new Error("Forbidden: org admin role required")
  }

  // Encode details as JSON; in production this would be AES-encrypted with a
  // server-managed key before storage. The column name 'details_encrypted'
  // signals that callers must never pass this value back to the client.
  const details = JSON.stringify({
    account_name: accountName,
    account_number: accountNumber,
    branch_code: branchCode || null,
    provider,
  })

  const { error } = await supabase.from("payout_accounts").insert({
    org_id: orgId,
    provider,
    details_encrypted: details,
  })

  if (error) throw new Error(error.message)

  // Audit the addition (no sensitive fields in changes)
  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: session.user.id,
    table_name: "payout_accounts",
    record_id: null,
    action: "insert",
    changes: {
      business_action: "add_payout_account",
      provider,
      account_name: accountName,
    },
  })
}
