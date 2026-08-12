"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  PayoutEncryptionConfigurationError,
  encryptPayoutDetails,
} from "@/lib/payout-crypto"

// TICK-54 / TICK-376 — Payout account management (organizer side)
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

  let details: string
  try {
    details = encryptPayoutDetails({
      account_name: accountName,
      account_number: accountNumber,
      branch_code: branchCode || null,
      provider,
    })
  } catch (error) {
    if (error instanceof PayoutEncryptionConfigurationError) {
      // Fail closed. Never fall back to plaintext and never echo bank details or
      // encryption key material through a server-action error.
      throw new Error("Payout account storage is temporarily unavailable. Please contact support.")
    }
    throw error
  }

  const { error } = await supabase.from("payout_accounts").insert({
    org_id: orgId,
    provider,
    details_encrypted: details,
  })

  if (error) throw new Error(error.message)

  // Audit only the non-sensitive business action. Account holder name, number,
  // branch code and encrypted payload are intentionally excluded.
  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: session.user.id,
    table_name: "payout_accounts",
    record_id: null,
    action: "insert",
    changes: {
      business_action: "add_payout_account",
      provider,
    },
  })
}
