"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { encryptPayoutDetails } from "@/lib/payout-crypto"

// TICK-54 — Payout account management (organizer side)
// Bank details are encrypted at rest (AES-256-GCM) and never returned to the browser.

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

  // Encrypt the bank details before storage (AES-256-GCM via
  // PAYOUT_ENCRYPTION_KEY). The value is never returned to the client.
  const details = encryptPayoutDetails({
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
