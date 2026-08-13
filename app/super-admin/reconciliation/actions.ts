"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

import { getPostEventReconciliationOverview } from "@/lib/data/admin/reconciliation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requireAdminRole } from "@/lib/super-admin/auth"

const ISSUE_STATUSES = new Set(["open", "acknowledged", "resolved", "ignored"])

export async function updateReconciliationIssueAction(
  issueId: string,
  nextStatus: string,
  formData?: FormData,
) {
  await requireAdminRole(["super_admin", "finance_admin"])

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(issueId)) {
    throw new Error("Invalid reconciliation issue id.")
  }
  if (!ISSUE_STATUSES.has(nextStatus)) throw new Error("Invalid reconciliation status.")

  const resolutionNote = String(formData?.get("resolution_note") ?? "").trim()
  if ((nextStatus === "resolved" || nextStatus === "ignored") && !resolutionNote) {
    throw new Error("A resolution note is required.")
  }
  if (resolutionNote.length > 1000) throw new Error("Resolution notes must be 1000 characters or fewer.")

  const supabase = await createClient()
  const { error } = await (supabase.rpc as any)("fn_update_finance_reconciliation_issue", {
    p_issue_id: issueId,
    p_new_status: nextStatus,
    p_resolution_note: resolutionNote || null,
  })

  if (error) throw new Error(error.message)

  revalidatePath("/super-admin")
  revalidatePath("/super-admin/reconciliation")
  revalidatePath("/super-admin/audit")
  redirect("/super-admin/reconciliation?status=issue_updated")
}

export async function logReconciliationReviewAction(eventId: string) {
  const { user } = await requireAdminRole(["super_admin", "finance_admin"])
  const overview = await getPostEventReconciliationOverview()
  const event = overview.events.find((row) => row.eventId === eventId)

  if (!event) {
    throw new Error("Event reconciliation row was not found. Refresh and try again.")
  }

  const admin = createAdminClient()
  const { error } = await admin.from("audit_log").insert({
    org_id: event.orgId,
    actor_id: user.id,
    table_name: "events",
    record_id: event.eventId,
    action: "other",
    changes: {
      business_action: "post_event_reconciliation_review",
      reconciliation_status: event.status,
      generated_at: overview.generatedAt,
      expected: {
        gross_cents: event.expectedGrossCents,
        fee_cents: event.expectedFeeCents,
        net_cents: event.expectedNetCents,
        paid_order_count: event.paidOrderCount,
        paid_ticket_count: event.paidTicketCount,
      },
      ledger: {
        gross_cents: event.ledgerGrossCents,
        fee_signed_cents: event.ledgerFeeSignedCents,
        net_cents: event.ledgerNetCents,
      },
      live_stats: {
        tickets_sold: event.statsTicketsSold,
        gross_sales_cents: event.statsGrossSalesCents,
        successful_payments: event.statsSuccessfulPayments,
        failed_payments: event.statsFailedPayments,
        checked_in_count: event.statsCheckedInCount,
      },
      payment_attempts: {
        stuck_count: event.stuckPaymentAttemptCount,
        orphaned_count: event.orphanedPaymentAttemptCount,
      },
      payout_review: {
        open_payout_count: event.openPayoutCount,
        open_payout_cents: event.openPayoutCents,
      },
      checks: event.checks.map((check) => ({
        key: check.key,
        status: check.status,
        label: check.label,
        detail: check.detail,
      })),
    },
  })

  if (error) throw new Error(error.message)

  revalidatePath("/super-admin")
  revalidatePath("/super-admin/reconciliation")
  revalidatePath("/super-admin/audit")
  redirect("/super-admin/reconciliation?status=review_logged")
}
