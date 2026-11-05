"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { getOrgPayoutReconciliationBlock } from "@/lib/data/admin/reconciliation"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { PayoutSendError, sendPayoutViaDeltaPay, syncDeltaPayPayout } from "@/lib/payouts/deltapay-payouts"

type PayoutStatus = "requested" | "processing" | "paid" | "failed" | "cancelled"

const RECONCILIATION_GATED_PAYOUT_STATUSES = new Set<PayoutStatus>(["processing", "paid"])

const ALLOWED_PAYOUT_TRANSITIONS: Record<PayoutStatus, PayoutStatus[]> = {
  requested: ["processing", "cancelled", "failed"],
  processing: ["paid", "failed", "cancelled"],
  paid: [],
  failed: ["processing", "cancelled"],
  cancelled: [],
}

function assertValidPayoutTransition(currentStatus: PayoutStatus, nextStatus: PayoutStatus) {
  if (currentStatus === nextStatus) return

  const allowedNextStatuses = ALLOWED_PAYOUT_TRANSITIONS[currentStatus] ?? []
  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new Error(`Invalid payout transition: ${currentStatus} → ${nextStatus}`)
  }
}

function payoutPatchFor(nextStatus: PayoutStatus) {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status: nextStatus }

  // `payouts` only carries `paid_at` for lifecycle timestamps. Stamp it on
  // settlement, clear it otherwise so a re-opened payout doesn't look paid.
  patch.paid_at = nextStatus === "paid" ? now : null

  return patch
}

function payoutBlockMessage(blockedEventCount: number, nextStatus: PayoutStatus) {
  const eventLabel = blockedEventCount === 1 ? "ended event" : "ended events"
  return `Payout approval is blocked by unresolved reconciliation on ${blockedEventCount} ${eventLabel}. Resolve post-event reconciliation before marking this payout ${nextStatus}.`
}

async function setPayoutStatus(payoutId: string, nextStatus: PayoutStatus, formData?: FormData) {
  const { user } = await requireAdminRole(["super_admin", "finance_admin"])
  const admin = createAdminClient()
  const note = formData?.get("note")?.toString().trim() || null

  const { data: payout, error: payoutError } = await admin
    .from("payouts")
    .select("id, org_id, status, amount_cents, currency, provider_rail")
    .eq("id", payoutId)
    .maybeSingle()

  if (payoutError) throw new Error(payoutError.message)
  if (!payout) throw new Error("Payout not found")

  const currentStatus = String(payout.status) as PayoutStatus
  assertValidPayoutTransition(currentStatus, nextStatus)

  if (nextStatus === "paid" && (payout as { provider_rail?: string | null }).provider_rail === "deltapay") {
    throw new Error("This payout was sent through DeltaPay. It's marked paid when DeltaPay confirms the transfer: use “Check DeltaPay status”.")
  }

  if (currentStatus === nextStatus) {
    revalidatePath("/super-admin")
    revalidatePath("/super-admin/payouts")
    revalidatePath(`/super-admin/payouts/${payoutId}`)
    redirect("/super-admin/payouts?status=finance_updated")
  }

  if (RECONCILIATION_GATED_PAYOUT_STATUSES.has(nextStatus)) {
    const block = await getOrgPayoutReconciliationBlock(payout.org_id)

    if (block.blocked) {
      const blockedEvents = block.blockedEvents.map((event) => ({
        event_id: event.eventId,
        title: event.title,
        blocking_checks: event.blockingChecks.map((check) => ({
          key: check.key,
          label: check.label,
          status: check.status,
          detail: check.detail,
        })),
        expected_net_cents: event.expectedNetCents,
        ledger_net_cents: event.ledgerNetCents,
      }))

      const { error: auditError } = await admin.from("audit_log").insert({
        org_id: payout.org_id,
        actor_id: user.id,
        table_name: "payouts",
        record_id: payoutId,
        action: "other",
        changes: {
          business_action: "payout_transition_blocked_by_reconciliation",
          previous_status: currentStatus,
          attempted_status: nextStatus,
          amount_cents: payout.amount_cents,
          currency: payout.currency,
          generated_at: block.generatedAt,
          blocked_events: blockedEvents,
          note,
        },
      })

      if (auditError) console.error("[finance-actions] failed to audit reconciliation block:", auditError)

      throw new Error(payoutBlockMessage(block.blockedEvents.length, nextStatus))
    }
  }

  const patch = payoutPatchFor(nextStatus)

  const { data: updatedPayout, error: updateError } = await admin
    .from("payouts")
    .update(patch as any)
    .eq("id", payoutId)
    .eq("status", currentStatus)
    .select("id, status")
    .maybeSingle()

  if (updateError) throw new Error(updateError.message)
  if (!updatedPayout) throw new Error("Payout status changed before this action completed. Refresh and try again.")

  await admin.from("audit_log").insert({
    org_id: payout.org_id,
    actor_id: user.id,
    table_name: "payouts",
    record_id: payoutId,
    action: "update",
    changes: {
      business_action: "review_payout_status",
      previous_status: currentStatus,
      new_status: nextStatus,
      amount_cents: payout.amount_cents,
      currency: payout.currency,
      note,
    },
  })

  revalidatePath("/super-admin")
  revalidatePath("/super-admin/payouts")
  revalidatePath(`/super-admin/payouts/${payoutId}`)
  redirect("/super-admin/payouts?status=finance_updated")
}

export async function markPayoutProcessingAction(payoutId: string, formData?: FormData) {
  await setPayoutStatus(payoutId, "processing", formData)
}

export async function markPayoutPaidAction(payoutId: string, formData?: FormData) {
  await setPayoutStatus(payoutId, "paid", formData)
}

export async function markPayoutFailedAction(payoutId: string, formData?: FormData) {
  await setPayoutStatus(payoutId, "failed", formData)
}

export async function cancelPayoutAction(payoutId: string, formData?: FormData) {
  await setPayoutStatus(payoutId, "cancelled", formData)
}

/* ── DeltaPay payouts (EljayMedia wallet → Eswatini Payment Switch) ───────── */

function payoutQueueRedirect(params: Record<string, string>): never {
  revalidatePath("/super-admin")
  revalidatePath("/super-admin/payouts")
  redirect(`/super-admin/payouts?${new URLSearchParams(params)}`)
}

export async function sendPayoutViaDeltaPayAction(payoutId: string, formData?: FormData) {
  const { user } = await requireAdminRole(["super_admin", "finance_admin"])
  const note = formData?.get("note")?.toString().trim() || null
  try {
    await sendPayoutViaDeltaPay({ payoutId, actorId: user.id, note })
  } catch (error) {
    payoutQueueRedirect({ deltapay_error: error instanceof PayoutSendError ? error.message : "DeltaPay payout failed." })
  }
  payoutQueueRedirect({ deltapay: "sent" })
}

export async function checkDeltaPayPayoutAction(payoutId: string) {
  const { user } = await requireAdminRole(["super_admin", "finance_admin"])
  let result: string
  try {
    result = await syncDeltaPayPayout(payoutId, user.id)
  } catch (error) {
    payoutQueueRedirect({ deltapay_error: error instanceof Error ? error.message : "Couldn't reach DeltaPay." })
  }
  payoutQueueRedirect({ deltapay: result })
}
