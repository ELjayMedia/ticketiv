"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"
import { ADMIN_ROLE_TIERS } from "@/lib/super-admin/permissions"
import type { DisputeKind, DisputeStatus } from "@/lib/data/admin/disputes"

export interface DisputeActionResult {
  ok: boolean
  message: string
}

/**
 * Move a dispute through its lifecycle.
 *
 * The RPC is service-role only, so authorization lives here: read-only tiers
 * cannot act, and every transition is written to audit_log with the actor. The
 * RPC itself refuses to reopen a closed dispute, so the terminal state is
 * enforced in the database rather than only in the UI.
 */
export async function transitionDispute(input: {
  disputeId: string
  status: DisputeStatus
  resolution?: string | null
  refundId?: string | null
  assignToMe?: boolean
}): Promise<DisputeActionResult> {
  const { user, roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  if (roleTier === "read_only_admin") {
    return { ok: false, message: "Read-only admins cannot action disputes" }
  }
  if (!input.disputeId?.trim()) return { ok: false, message: "dispute id required" }

  const admin = createAdminClient()
  const { data, error } = await (admin.rpc as any)("fn_transition_dispute", {
    p_dispute_id: input.disputeId,
    p_status: input.status,
    p_resolution: input.resolution ?? null,
    p_refund_id: input.refundId ?? null,
    p_assigned_to: input.assignToMe ? user.id : null,
  })

  if (error) return { ok: false, message: error.message }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    table_name: "disputes",
    record_id: input.disputeId,
    action: "update",
    changes: {
      business_action: "dispute_transition",
      to_status: input.status,
      refund_id: input.refundId ?? null,
      assigned: Boolean(input.assignToMe),
    },
  })

  revalidatePath("/super-admin/disputes")
  return { ok: true, message: `Moved to ${input.status}`, ...(data ? {} : {}) }
}

/**
 * Open a dispute by hand — the support-desk path for a customer who emails or
 * calls. Provider-raised chargebacks do not need this: fn_record_chargeback
 * opens its own dispute automatically so the queue never misses the cases where
 * money has already been clawed back.
 */
export async function openDispute(input: {
  kind: DisputeKind
  orderId?: string | null
  paymentId?: string | null
  reason?: string | null
  amountCents?: number | null
}): Promise<DisputeActionResult> {
  const { user, roleTier } = await requireAdminRole(ADMIN_ROLE_TIERS)
  if (roleTier === "read_only_admin") {
    return { ok: false, message: "Read-only admins cannot open disputes" }
  }
  if (!input.orderId?.trim() && !input.paymentId?.trim()) {
    return { ok: false, message: "An order id or payment id is required" }
  }

  const admin = createAdminClient()
  const { data, error } = await (admin.rpc as any)("fn_open_dispute", {
    p_kind: input.kind,
    p_order_id: input.orderId?.trim() || null,
    p_payment_id: input.paymentId?.trim() || null,
    p_reason: input.reason ?? null,
    p_amount_cents: input.amountCents ?? null,
    p_raised_by: null,
    p_dedupe_key: null,
  })

  if (error) return { ok: false, message: error.message }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    table_name: "disputes",
    record_id: (data as { id?: string } | null)?.id ?? null,
    action: "insert",
    changes: { business_action: "dispute_opened", kind: input.kind },
  })

  revalidatePath("/super-admin/disputes")
  return { ok: true, message: "Dispute opened" }
}
