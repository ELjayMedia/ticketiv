import "server-only"

import { getOrgPayoutReconciliationBlock } from "@/lib/data/admin/reconciliation"
import { payoutStatusForTransaction, payoutIdFromReference } from "@/lib/payments/deltapay-wallet-core"
import {
  DeltaPayWalletError,
  getDeltaPayWalletConfig,
  lookupPayoutTransaction,
  previewEpsPayout,
  sendEpsPayout,
  type EpsWithdrawalInput,
} from "@/lib/payments/deltapay-wallet"
import { decryptPayoutDetails } from "@/lib/payout-crypto"
import { checkEpsAccount } from "@/lib/payouts/eps-directory"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Organizer payouts through the DeltaPay wallet (EljayMedia-owned) over the
 * Eswatini Payment Switch.
 *
 *   requested/failed ──Send via DeltaPay──▶ processing ──signed callback / status check──▶ paid | failed
 *
 * Safety:
 *   - Reconciliation must be clear for the org (same gate as manual payouts).
 *   - The payout is claimed (requested/failed → processing, conditional
 *     update) before anything is sent, so two clicks can't send twice.
 *   - Every transfer carries metadata "ticketiv-payout:<id>"; before re-sending
 *     a failed payout we look that reference up and never send it again if
 *     DeltaPay already has a transaction for it.
 *   - Only a DeltaPay "succeeded" for the exact payout amount marks it paid.
 */

type Admin = ReturnType<typeof createAdminClient>

interface PayoutRow {
  id: string
  org_id: string
  status: string
  amount_cents: number
  currency: string
  provider_rail: string | null
  provider_transaction_id: number | null
}

const PAYOUT_COLUMNS = "id, org_id, status, amount_cents, currency, provider_rail, provider_transaction_id"

async function audit(admin: Admin, payout: Pick<PayoutRow, "id" | "org_id">, actorId: string | null, changes: Record<string, unknown>) {
  const { error } = await admin.from("audit_log").insert({
    org_id: payout.org_id,
    actor_id: actorId,
    table_name: "payouts",
    record_id: payout.id,
    action: "update",
    changes,
  } as never)
  if (error) console.error("[deltapay-payouts] audit failed:", error.message)
}

async function loadPayout(admin: Admin, payoutId: string): Promise<PayoutRow | null> {
  const { data, error } = await admin.from("payouts").select(PAYOUT_COLUMNS).eq("id", payoutId).maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PayoutRow | null) ?? null
}

/** Whether DeltaPay payouts can be sent from this deployment (all config present). */
export function deltaPayPayoutsAvailable(): boolean {
  return getDeltaPayWalletConfig().operational
}

/** The org's primary payout account as an EPS destination, or why it can't be paid automatically. */
async function primaryEpsDestination(admin: Admin, orgId: string) {
  const { data } = await admin
    .from("payout_accounts")
    .select("provider, details_encrypted")
    .eq("org_id", orgId)
    .eq("is_primary", true)
    .maybeSingle()
  if (!data) return { ok: false as const, message: "The organizer has no primary payout account." }
  const details = decryptPayoutDetails((data as { details_encrypted: string | null }).details_encrypted)
  const number = typeof details?.account_number === "string" ? details.account_number : ""
  const check = checkEpsAccount((data as { provider: string }).provider, number)
  if (!check.ok) {
    return {
      ok: false as const,
      message:
        check.reason === "not_eps"
          ? "The primary payout account's bank isn't on the Eswatini Payment Switch. Pay it manually."
          : "The primary payout account number doesn't match its bank's format. Ask the organizer to re-add it.",
    }
  }
  return { ok: true as const, agentId: check.destination.agentId, scheme: check.destination.scheme, accountNumber: check.accountNumber }
}

export class PayoutSendError extends Error {}

export async function sendPayoutViaDeltaPay({ payoutId, actorId, note }: { payoutId: string; actorId: string; note: string | null }) {
  const admin = createAdminClient()
  const payout = await loadPayout(admin, payoutId)
  if (!payout) throw new PayoutSendError("Payout not found")
  if (payout.status !== "requested" && payout.status !== "failed") {
    throw new PayoutSendError(`Only requested or failed payouts can be sent (this one is ${payout.status}).`)
  }
  if (payout.currency !== "SZL") throw new PayoutSendError("DeltaPay payouts are SZL only.")
  if (!deltaPayPayoutsAvailable()) throw new PayoutSendError("DeltaPay payouts are not configured on this deployment.")

  const block = await getOrgPayoutReconciliationBlock(payout.org_id)
  if (block.blocked) {
    throw new PayoutSendError(
      `Blocked by unresolved reconciliation on ${block.blockedEvents.length} ended event${block.blockedEvents.length === 1 ? "" : "s"}.`,
    )
  }

  // A failed payout may still have reached DeltaPay (e.g. a timeout after it
  // accepted the transfer). Never send the same reference twice.
  if (payout.status === "failed" && payout.provider_rail === "deltapay") {
    let existing: Awaited<ReturnType<typeof lookupPayoutTransaction>>
    try {
      existing = await lookupPayoutTransaction(payout.id)
    } catch {
      throw new PayoutSendError("Couldn't check DeltaPay for an earlier transfer of this payout, so it wasn't sent again. Try again shortly.")
    }
    if (existing?.transactionId != null) {
      await applyDeltaPayPayoutUpdate({ payoutId: payout.id, status: existing.status, transactionId: existing.transactionId, amount: existing.amount, source: "lookup", actorId })
      throw new PayoutSendError("DeltaPay already has a transfer for this payout. Its status has been refreshed instead of sending again.")
    }
  }

  const destination = await primaryEpsDestination(admin, payout.org_id)
  if (!destination.ok) throw new PayoutSendError(destination.message)

  const input: EpsWithdrawalInput = {
    payoutId: payout.id,
    amountCents: payout.amount_cents,
    agentId: destination.agentId,
    accountNumber: destination.accountNumber,
    scheme: destination.scheme,
    note: `Ticketiv payout ${payout.id.slice(0, 8).toUpperCase()}`,
  }

  const preview = await previewEpsPayout(input)
  if (!preview.possible) {
    await audit(admin, payout, actorId, { business_action: "deltapay_payout_preview_rejected", reason: preview.reason, amount_cents: payout.amount_cents })
    throw new PayoutSendError(`DeltaPay can't send this payout: ${preview.reason}`)
  }

  // Claim before sending: only one request can move it to processing.
  const { data: claimed, error: claimError } = await admin
    .from("payouts")
    .update({
      status: "processing",
      paid_at: null,
      provider_rail: "deltapay",
      provider_reference: `ticketiv-payout:${payout.id}`,
      provider_status: null,
      provider_tracking_id: null,
      provider_fee_cents: preview.feeCents,
      failure_reason: null,
      submitted_at: new Date().toISOString(),
    } as never)
    .eq("id", payout.id)
    .eq("status", payout.status as "requested" | "failed")
    .select("id")
    .maybeSingle()
  if (claimError) throw new PayoutSendError(claimError.message)
  if (!claimed) throw new PayoutSendError("Payout status changed before it could be sent. Refresh and try again.")

  try {
    const { trackingId } = await sendEpsPayout(input)
    await admin.from("payouts").update({ provider_tracking_id: trackingId, provider_status: "submitted" } as never).eq("id", payout.id)
    await audit(admin, payout, actorId, {
      business_action: "deltapay_payout_submitted",
      previous_status: payout.status,
      new_status: "processing",
      amount_cents: payout.amount_cents,
      fee_cents: preview.feeCents,
      tracking_id: trackingId,
      eps_agent_id: destination.agentId,
      note,
    })
  } catch (error) {
    const reason = error instanceof DeltaPayWalletError ? error.message : "DeltaPay request failed"
    // Unknown outcome on a network error: leave it processing so a status
    // check (by reference) settles it, instead of inviting a second send.
    const definite = error instanceof DeltaPayWalletError && reason !== "Unable to reach DeltaPay"
    if (definite) {
      await admin.from("payouts").update({ status: "failed", failure_reason: reason, provider_status: "rejected" } as never).eq("id", payout.id).eq("status", "processing")
    } else {
      await admin.from("payouts").update({ failure_reason: "Submission outcome unknown — check DeltaPay status." } as never).eq("id", payout.id)
    }
    await audit(admin, payout, actorId, { business_action: "deltapay_payout_submit_failed", reason, outcome_known: definite, note })
    throw new PayoutSendError(definite ? `DeltaPay rejected the payout: ${reason}` : "Couldn't confirm the payout reached DeltaPay. Use “Check DeltaPay status” before retrying.")
  }
}

export type PayoutUpdateResult = "paid" | "failed" | "processing" | "unchanged" | "ignored" | "amount_mismatch"

/**
 * Applies a DeltaPay transaction status to a payout (signed callback or a
 * status lookup). Idempotent: repeats and late duplicates change nothing.
 */
export async function applyDeltaPayPayoutUpdate(input: {
  payoutId: string
  status: string | null
  transactionId: number | null
  amount: number | null
  source: "callback" | "lookup"
  actorId?: string | null
}): Promise<PayoutUpdateResult> {
  const admin = createAdminClient()
  const payout = await loadPayout(admin, input.payoutId)
  if (!payout || payout.provider_rail !== "deltapay") return "ignored"

  if (input.amount != null && Math.round(input.amount * 100) !== payout.amount_cents) {
    await admin.from("payouts").update({ failure_reason: `DeltaPay amount ${input.amount} does not match the payout.` } as never).eq("id", payout.id)
    await audit(admin, payout, input.actorId ?? null, { business_action: "deltapay_payout_amount_mismatch", source: input.source, provider_amount: input.amount, amount_cents: payout.amount_cents })
    return "amount_mismatch"
  }

  const next = payoutStatusForTransaction(input.status)
  const tracking: Record<string, unknown> = { provider_status: input.status }
  if (input.transactionId != null && payout.provider_transaction_id == null) tracking.provider_transaction_id = input.transactionId

  if (next === "paid" && payout.status !== "paid" && payout.status !== "cancelled") {
    const { data } = await admin
      .from("payouts")
      .update({ ...tracking, status: "paid", paid_at: new Date().toISOString(), failure_reason: null } as never)
      .eq("id", payout.id)
      .eq("status", payout.status as "requested" | "processing" | "failed")
      .select("id")
      .maybeSingle()
    if (data) {
      await audit(admin, payout, input.actorId ?? null, { business_action: "deltapay_payout_paid", source: input.source, previous_status: payout.status, transaction_id: input.transactionId, amount_cents: payout.amount_cents })
      return "paid"
    }
    return "unchanged"
  }

  if (next === "failed" && payout.status === "processing") {
    const { data } = await admin
      .from("payouts")
      .update({ ...tracking, status: "failed", paid_at: null, failure_reason: `DeltaPay reported the transfer ${input.status}.` } as never)
      .eq("id", payout.id)
      .eq("status", "processing")
      .select("id")
      .maybeSingle()
    if (data) {
      await audit(admin, payout, input.actorId ?? null, { business_action: "deltapay_payout_failed", source: input.source, provider_status: input.status, transaction_id: input.transactionId })
      return "failed"
    }
    return "unchanged"
  }

  await admin.from("payouts").update(tracking as never).eq("id", payout.id)
  return next === "processing" ? "processing" : "unchanged"
}

/** Finance "Check DeltaPay status": look the transfer up by our reference. */
export async function syncDeltaPayPayout(payoutId: string, actorId: string): Promise<PayoutUpdateResult | "not_found"> {
  const tx = await lookupPayoutTransaction(payoutId)
  if (!tx || tx.transactionId == null) return "not_found"
  if (tx.metadata && payoutIdFromReference(tx.metadata) !== payoutId) return "ignored"
  return applyDeltaPayPayoutUpdate({ payoutId, status: tx.status, transactionId: tx.transactionId, amount: tx.amount, source: "lookup", actorId })
}
