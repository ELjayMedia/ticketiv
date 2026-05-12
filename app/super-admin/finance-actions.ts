"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"

type PayoutStatus = "requested" | "processing" | "paid" | "failed" | "cancelled"

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

  const patch: Record<string, unknown> = { status: nextStatus }
  if (nextStatus === "paid") patch.paid_at = new Date().toISOString()
  if (nextStatus !== "paid") patch.paid_at = null

  const { error: updateError } = await admin.from("payouts").update(patch).eq("id", payoutId)
  if (updateError) throw new Error(updateError.message)

  await admin.from("audit_log").insert({
    org_id: payout.org_id,
    actor_id: user.id,
    table_name: "payouts",
    record_id: payoutId,
    action: "update",
    changes: {
      business_action: "review_payout_status",
      previous_status: payout.status,
      new_status: nextStatus,
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
