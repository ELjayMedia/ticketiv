"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"

type PayoutStatus = "requested" | "processing" | "paid" | "failed" | "cancelled"

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

async function setPayoutStatus(payoutId: string, nextStatus: PayoutStatus, formData?: FormData) {
  const { user } = await requireAdminRole(["super_admin", "finance_admin"])
  const admin = createAdminClient()
  const note = formData?.get("note")?.toString().trim() || null

  const { data: payout, error: payoutError } = await admin
    .from("payouts")
    .select("id, org_id, status, amount_cents, currency")
    .eq("id", payoutId)
    .maybeSingle()

  if (payoutError) throw new Error(payoutError.message)
  if (!payout) throw new Error("Payout not found")

  const currentStatus = String(payout.status) as PayoutStatus
  assertValidPayoutTransition(currentStatus, nextStatus)

  if (currentStatus === nextStatus) {
    revalidatePath("/super-admin")
    revalidatePath("/super-admin/payouts")
    revalidatePath(`/super-admin/payouts/${payoutId}`)
    redirect("/super-admin/payouts?status=finance_updated")
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
