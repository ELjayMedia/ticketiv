"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Transfer {
  id: string
  order_item_id: string
  from_user_id: string
  to_user_id: string
  status: "pending" | "accepted" | "rejected" | "completed"
  requested_at: string
  responded_at?: string
  completed_at?: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
}

/**
 * Get transfer history for a user
 * Reads from: transfers
 */
export async function getUserTransfers(userId: string): Promise<Transfer[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
      .order("requested_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching transfers:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching transfers:", error)
    return []
  }
}

/**
 * Get pending transfer requests for a user
 * Reads from: transfers
 */
export async function getPendingTransfers(userId: string): Promise<Transfer[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("to_user_id", userId)
      .eq("status", "pending")
      .order("requested_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching pending transfers:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching pending transfers:", error)
    return []
  }
}

/**
 * Request a ticket transfer
 * Writes to: transfers
 */
export async function requestTransfer(orderItemId: string, toUserId: string): Promise<Transfer | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const session = await supabase.auth.getSession()
    if (!session.data.session?.user) {
      console.error("[v0] User not authenticated")
      return null
    }

    const { data, error } = await supabase
      .from("transfers")
      .insert({
        order_item_id: orderItemId,
        from_user_id: session.data.session.user.id,
        to_user_id: toUserId,
        status: "pending",
        requested_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating transfer:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error creating transfer:", error)
    return null
  }
}

/**
 * Accept a transfer request
 * Writes to: transfers
 */
export async function acceptTransfer(transferId: string): Promise<Transfer | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("transfers")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
      })
      .eq("id", transferId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error accepting transfer:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error accepting transfer:", error)
    return null
  }
}

/**
 * Reject a transfer request
 * Writes to: transfers
 */
export async function rejectTransfer(transferId: string, reason?: string): Promise<Transfer | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("transfers")
      .update({
        status: "rejected",
        responded_at: new Date().toISOString(),
        cancellation_reason: reason,
      })
      .eq("id", transferId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error rejecting transfer:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error rejecting transfer:", error)
    return null
  }
}
