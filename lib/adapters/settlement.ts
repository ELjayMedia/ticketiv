"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { validateSchema, AdminPayoutSummaryViewSchema, type AdminPayoutSummaryView } from "@/lib/schemas/views"

/**
 * Adapter for admin settlement and payout operations
 * All admin operations query views instead of direct table access
 */

export async function getAdminPayoutSummary(params?: {
  status?: "pending" | "processing" | "completed" | "failed"
  limit?: number
  offset?: number
}): Promise<AdminPayoutSummaryView[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch payout summary")
    return []
  }

  try {
    let query = supabase.from("v_admin_payout_summary").select("*")

    if (params?.status) {
      query = query.eq("status", params.status)
    }

    query = query.order("last_updated", { ascending: false })

    // Apply pagination
    const limit = params?.limit || 50
    const offset = params?.offset || 0
    query = query.range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      console.error("[v0] Error fetching payout summary:", error)
      return []
    }

    if (!data) return []
    return data.map((item) => validateSchema(AdminPayoutSummaryViewSchema, item, "v_admin_payout_summary"))
  } catch (error) {
    console.error("[v0] Exception in getAdminPayoutSummary:", error)
    return []
  }
}

export async function getOrganizerPayoutStatus(orgId: string): Promise<AdminPayoutSummaryView | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch organizer payout status")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_admin_payout_summary")
      .select("*")
      .eq("org_id", orgId)
      .single()

    if (error) {
      console.error("[v0] Error fetching organizer payout status:", error)
      return null
    }

    if (!data) return null
    return validateSchema(AdminPayoutSummaryViewSchema, data, "v_admin_payout_summary")
  } catch (error) {
    console.error("[v0] Exception in getOrganizerPayoutStatus:", error)
    return null
  }
}

/**
 * Get aggregated settlement data for dashboard
 */
export async function getSettlementMetrics(): Promise<{
  pending_payouts_cents: number
  processing_payouts_cents: number
  completed_payouts_cents: number
  total_organizers: number
} | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    console.warn("[v0] Supabase not configured, cannot fetch settlement metrics")
    return null
  }

  try {
    const { data, error } = await supabase
      .from("v_admin_payout_summary")
      .select("status, amount_cents")

    if (error) {
      console.error("[v0] Error fetching settlement metrics:", error)
      return null
    }

    if (!data || data.length === 0) {
      return {
        pending_payouts_cents: 0,
        processing_payouts_cents: 0,
        completed_payouts_cents: 0,
        total_organizers: 0,
      }
    }

    const metrics = data.reduce(
      (acc, item) => {
        if (item.status === "pending") acc.pending_payouts_cents += item.amount_cents
        if (item.status === "processing") acc.processing_payouts_cents += item.amount_cents
        if (item.status === "completed") acc.completed_payouts_cents += item.amount_cents
        return acc
      },
      {
        pending_payouts_cents: 0,
        processing_payouts_cents: 0,
        completed_payouts_cents: 0,
        total_organizers: data.length,
      }
    )

    return metrics
  } catch (error) {
    console.error("[v0] Exception in getSettlementMetrics:", error)
    return null
  }
}
