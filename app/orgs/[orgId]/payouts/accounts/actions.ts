"use server"

import { revalidatePath } from "next/cache"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import {
  PayoutEncryptionConfigurationError,
  encryptPayoutDetails,
} from "@/lib/payout-crypto"
import { checkEpsAccount, epsDestinationFor } from "@/lib/payouts/eps-directory"

// TICK-54 / TICK-376 — Payout account management (organizer side)
// Bank details are encrypted at rest (AES-256-GCM) and never returned to the browser.
// All writes go through SECURITY DEFINER RPCs (migration 20261102120000).

const RPC_ERRORS: Record<string, string> = {
  not_authorized: "Only org owners and admins can manage payout accounts.",
  invalid_payout_account: "Enter the bank and account details.",
  payout_in_progress: "A payout is being paid to this account. Remove it after the payout completes.",
  claimed_account_required: "Verify your account before managing payout accounts.",
}

function rpcError(error: { message?: string } | null): Error {
  const key = Object.keys(RPC_ERRORS).find((k) => error?.message?.includes(k))
  return new Error(key ? RPC_ERRORS[key] : "Couldn't update payout accounts. Please try again.")
}

async function signedInClient() {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not authenticated")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")
  return supabase
}

function revalidate(orgId: string) {
  revalidatePath(`/orgs/${orgId}/payouts/accounts`)
  revalidatePath(`/orgs/${orgId}/payouts`)
}

export async function addPayoutAccountAction(
  orgId: string,
  provider: string,
  accountNumber: string,
  branchCode: string,
  accountName: string,
  makePrimary = false,
) {
  const supabase = await signedInClient()

  // Banks and wallets on the Eswatini Payment Switch are validated against the
  // switch's published account format and stored with their EPS routing, so
  // automatic DeltaPay payouts can't fail later on a typo.
  let number = accountNumber.trim()
  let eps: { eps_agent_id: string; eps_scheme: string } | null = null
  if (epsDestinationFor(provider)) {
    const check = checkEpsAccount(provider, accountNumber)
    if (!check.ok) throw new Error(check.message)
    number = check.accountNumber
    eps = { eps_agent_id: check.destination.agentId, eps_scheme: check.destination.scheme }
  }

  let details: string
  try {
    details = encryptPayoutDetails({
      account_name: accountName,
      account_number: number,
      branch_code: eps?.eps_scheme === "EWLT" ? null : branchCode || null,
      provider,
      ...(eps ?? {}),
    })
  } catch (error) {
    if (error instanceof PayoutEncryptionConfigurationError) {
      // Fail closed. Never fall back to plaintext and never echo bank details or
      // encryption key material through a server-action error.
      throw new Error("Payout account storage is temporarily unavailable. Please contact support.")
    }
    throw error
  }

  // SECURITY DEFINER RPC: checks org owner/admin, keeps one primary account
  // per org (the first account is always primary) and writes the audit entry
  // without any bank details.
  const { error } = await (supabase.rpc as any)("fn_add_payout_account", {
    p_org_id: orgId,
    p_provider: provider,
    p_details_encrypted: details,
    p_make_primary: makePrimary,
  })
  if (error) throw rpcError(error)
  revalidate(orgId)
}

export async function setPrimaryPayoutAccountAction(orgId: string, accountId: string) {
  const supabase = await signedInClient()
  const { error } = await (supabase.rpc as any)("fn_set_primary_payout_account", { p_account_id: accountId })
  if (error) throw rpcError(error)
  revalidate(orgId)
}

export async function deletePayoutAccountAction(orgId: string, accountId: string) {
  const supabase = await signedInClient()
  const { error } = await (supabase.rpc as any)("fn_delete_payout_account", { p_account_id: accountId })
  if (error) throw rpcError(error)
  revalidate(orgId)
}
