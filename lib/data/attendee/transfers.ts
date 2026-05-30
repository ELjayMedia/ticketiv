"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

// DB schema: id, order_item_id, from_user_id, to_user_id, status, metadata, created_at, updated_at
// Status enum: requested | pending | accepted | declined | cancelled | completed
export interface Transfer {
  id: string
  order_item_id: string
  from_user_id: string
  to_user_id: string
  status: "requested" | "pending" | "accepted" | "declined" | "cancelled" | "completed"
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export async function getUserTransfers(userId: string): Promise<Transfer[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[transfers] getUserTransfers:", error)
    return []
  }
  return data ?? []
}

export async function getPendingTransfers(userId: string): Promise<Transfer[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("transfers")
    .select("*")
    .eq("to_user_id", userId)
    .in("status", ["pending", "requested"])
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[transfers] getPendingTransfers:", error)
    return []
  }
  return data ?? []
}

export async function requestTransfer(orderItemId: string, toUserId: string): Promise<Transfer | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("transfers")
    .insert({
      order_item_id: orderItemId,
      from_user_id: user.id,
      to_user_id: toUserId,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[transfers] requestTransfer:", error)
    return null
  }
  return data
}

// Calls fn_complete_transfer which atomically sets transfer.status=completed
// and order_items.current_owner_id = to_user_id.
export async function acceptTransfer(transferId: string): Promise<{ transfer_id: string; order_item_id: string; new_owner_id: string } | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase.rpc("fn_complete_transfer", {
    p_transfer_id: transferId,
  })

  if (error) {
    console.error("[transfers] acceptTransfer:", error)
    return null
  }
  return data as { transfer_id: string; order_item_id: string; new_owner_id: string }
}

export async function declineTransfer(transferId: string, reason?: string): Promise<Transfer | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("transfers")
    .update({
      status: "declined",
      metadata: reason ? { decline_reason: reason } : null,
    })
    .eq("id", transferId)
    .select()
    .single()

  if (error) {
    console.error("[transfers] declineTransfer:", error)
    return null
  }
  return data
}

export async function cancelTransfer(transferId: string): Promise<Transfer | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("transfers")
    .update({ status: "cancelled" })
    .eq("id", transferId)
    .select()
    .single()

  if (error) {
    console.error("[transfers] cancelTransfer:", error)
    return null
  }
  return data
}
