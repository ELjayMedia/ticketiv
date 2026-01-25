"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Payment {
  id: string
  order_id: string
  amount_cents: number
  currency: string
  status: "pending" | "succeeded" | "failed"
  provider: string
  provider_transaction_id?: string
  created_at: string
}

export interface LedgerEntry {
  id: string
  user_id: string
  transaction_type: "order" | "refund" | "transfer" | "adjustment"
  amount_cents: number
  balance_after_cents: number
  reference_id?: string
  created_at: string
}

/**
 * Get user payment history
 * Reads from: payments, orders
 */
export async function getUserPayments(userId: string): Promise<Payment[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
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
 * Get user ledger/transaction history
 * Reads from: ledger_entries
 */
export async function getUserLedger(userId: string, limit: number = 50): Promise<LedgerEntry[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
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
 * Get current wallet balance
 * Reads from: ledger_entries
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return 0

  try {
    const { data, error } = await supabase
      .from("ledger_entries")
      .select("balance_after_cents")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching wallet balance:", error)
      return 0
    }

    return data?.balance_after_cents || 0
  } catch (error) {
    console.error("[v0] Unexpected error fetching wallet balance:", error)
    return 0
  }
}

/**
 * Get payment method stored for user
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
