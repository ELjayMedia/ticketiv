"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface LedgerEntry {
  id: string
  org_id: string
  transaction_type: string
  amount_cents: number
  reference_id?: string
  created_at: string
}

export interface Payout {
  id: string
  org_id: string
  account_id: string
  amount_cents: number
  status: "pending" | "processing" | "completed" | "failed"
  period_start: string
  period_end: string
  created_at: string
}

export interface PayoutAccount {
  id: string
  org_id: string
  account_type: "bank" | "stripe"
  status: "active" | "inactive"
  created_at: string
}

/**
 * Get org ledger entries
 * Reads from: ledger_entries
 */
export async function getOrgLedger(orgId: string, limit: number = 100): Promise<LedgerEntry[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching org ledger:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching org ledger:", error)
    return []
  }
}

/**
 * Get org payouts history
 * Reads from: payouts
 */
export async function getOrgPayouts(orgId: string): Promise<Payout[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching payouts:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching payouts:", error)
    return []
  }
}

/**
 * Get payout accounts for org
 * Reads from: payout_accounts
 */
export async function getPayoutAccounts(orgId: string): Promise<PayoutAccount[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("payout_accounts")
      .select("*")
      .eq("org_id", orgId)

    if (error) {
      console.error("[v0] Error fetching payout accounts:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching payout accounts:", error)
    return []
  }
}

/**
 * Get order ledger summary
 * Reads from: order_ledger_summary or v_my_order_ledger_summary
 */
export async function getOrderLedgerSummary(orgId: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("order_ledger_summary")
      .select("*")
      .eq("org_id", orgId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching order ledger summary:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error fetching order ledger summary:", error)
    return null
  }
}
