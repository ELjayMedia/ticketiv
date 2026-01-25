"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface LedgerEntry {
  id: string
  org_id?: string
  transaction_type: string
  amount_cents: number
  reference_id?: string
  created_at: string
}

export interface Payout {
  id: string
  org_id: string
  amount_cents: number
  status: "pending" | "processing" | "completed" | "failed"
  period_start: string
  period_end: string
  created_at: string
}

/**
 * Get all ledger entries for settlement verification
 * Reads from: ledger_entries
 */
export async function getLedgerEntries(filters?: {
  orgId?: string
  transactionType?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<LedgerEntry[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("ledger_entries").select("*")

    if (filters?.orgId) {
      query = query.eq("org_id", filters.orgId)
    }

    if (filters?.transactionType) {
      query = query.eq("transaction_type", filters.transactionType)
    }

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate)
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 100)

    if (error) {
      console.error("[v0] Error fetching ledger entries:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching ledger entries:", error)
    return []
  }
}

/**
 * Get all payouts for platform verification
 * Reads from: payouts
 */
export async function getAllPayouts(filters?: {
  status?: string
  startDate?: string
  endDate?: string
  limit?: number
}): Promise<Payout[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    let query = supabase.from("payouts").select("*")

    if (filters?.status) {
      query = query.eq("status", filters.status)
    }

    if (filters?.startDate) {
      query = query.gte("created_at", filters.startDate)
    }

    if (filters?.endDate) {
      query = query.lte("created_at", filters.endDate)
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(filters?.limit || 50)

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
 * Get payout reconciliation summary
 * Reads from: ledger_entries, payouts
 */
export async function getPayoutReconciliation(orgId?: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    let ledgerQuery = supabase.from("ledger_entries").select("amount_cents, transaction_type")

    if (orgId) {
      ledgerQuery = ledgerQuery.eq("org_id", orgId)
    }

    const { data: ledgerData, error: ledgerError } = await ledgerQuery

    if (ledgerError) {
      console.error("[v0] Error fetching ledger for reconciliation:", ledgerError)
      return null
    }

    let payoutQuery = supabase.from("payouts").select("amount_cents, status")

    if (orgId) {
      payoutQuery = payoutQuery.eq("org_id", orgId)
    }

    const { data: payoutData, error: payoutError } = await payoutQuery

    if (payoutError) {
      console.error("[v0] Error fetching payouts for reconciliation:", payoutError)
      return null
    }

    const totalLedger = (ledgerData || []).reduce((sum, entry) => sum + (entry.amount_cents || 0), 0)
    const totalPayouts = (payoutData || [])
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + (p.amount_cents || 0), 0)
    const outstanding = totalLedger - totalPayouts

    return {
      total_ledger_cents: totalLedger,
      total_payouts_cents: totalPayouts,
      outstanding_cents: outstanding,
    }
  } catch (error) {
    console.error("[v0] Unexpected error getting payout reconciliation:", error)
    return null
  }
}
