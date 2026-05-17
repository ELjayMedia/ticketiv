"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Payment {
  id: string
  order_id: string
  amount_cents: number
  currency: string
  status: string
  provider: string
  ext_payment_id?: string | null
  created_at: string
}

export interface LedgerEntry {
  id: string
  org_id: string
  order_id: string | null
  type: string
  amount_cents: number
  currency: string
  occurred_at: string
}

/**
 * Get user payment history.
 * Payments have no user column; they are reached through the owning order.
 * Reads from: payments, orders
 */
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*, orders!inner(buyer_id)")
      .eq("orders.buyer_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching payments:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching payments:", error)
    return []
  }
}

/**
 * Get the user's order-linked ledger entries.
 * Ledger entries have no user column; they are reached through the owning order.
 * Reads from: ledger_entries, orders
 */
export async function getUserLedger(userId: string, limit: number = 50): Promise<LedgerEntry[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("*, orders!inner(buyer_id)")
      .eq("orders.buyer_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[v0] Error fetching ledger:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching ledger:", error)
    return []
  }
}

/**
 * Get current wallet balance.
 * The ledger is org-level accounting and carries no per-user running balance,
 * so there is no stored attendee wallet balance to read.
 */
export async function getWalletBalance(_userId: string): Promise<number> {
  return 0
}

/**
 * Get payment methods stored for the user.
 * Reads from: payment_methods
 */
export async function getUserPaymentMethods(userId: string) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)

    if (error) {
      console.error("[v0] Error fetching payment methods:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching payment methods:", error)
    return []
  }
}
