"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

// DB schema: id, order_item_id, from_user_id, to_user_id, status, metadata, created_at, updated_at
// Status enum: requested | pending | accepted | declined | cancelled | completed
export interface Transfer {
  id: string
  order_item_id: string | null
  from_user_id: string | null
  to_user_id: string | null
  status: "requested" | "pending" | "accepted" | "declined" | "cancelled" | "completed"
  metadata: unknown
  created_at: string | null
  updated_at: string | null
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

  const { data, error } = await (supabase.rpc as any)("fn_complete_transfer", {
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

export type TransferHistoryDirection = "sent" | "received"

export interface TransferHistoryItem {
  id: string
  direction: TransferHistoryDirection
  status: Transfer["status"]
  createdAt: string
  eventTitle: string
  ticketTypeName: string | null
  counterpartyId: string
  counterpartyName: string
  canCancel: boolean
}

export async function getMyTransferHistory(): Promise<TransferHistoryItem[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: rows, error } = await supabase
    .from("transfers")
    .select(
      `
        id, from_user_id, to_user_id, status, created_at,
        order_item:order_items!inner(
          ticket_types(
            name,
            events(title)
          )
        )
      `,
    )
    .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(50)

  if (error) {
    console.error("[transfers] getMyTransferHistory:", error)
    return []
  }

  const raw = (rows ?? []) as unknown as Array<{
    id: string
    from_user_id: string
    to_user_id: string
    status: Transfer["status"]
    created_at: string
    order_item: {
      ticket_types: {
        name: string | null
        events: { title: string | null } | null
      } | null
    } | null
  }>

  const counterpartyIds = Array.from(
    new Set(raw.map((r) => (r.from_user_id === user.id ? r.to_user_id : r.from_user_id))),
  )

  let namesById = new Map<string, string>()
  if (counterpartyIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, display_name, name, surname")
      .in("user_id", counterpartyIds)
    for (const p of profs ?? []) {
      const display =
        (p as { display_name: string | null }).display_name?.trim() ||
        [(p as { name: string | null }).name, (p as { surname: string | null }).surname]
          .filter(Boolean)
          .join(" ")
          .trim()
      namesById.set((p as { user_id: string }).user_id, display || "Friend")
    }
  }

  return raw.map((r): TransferHistoryItem => {
    const direction: TransferHistoryDirection =
      r.from_user_id === user.id ? "sent" : "received"
    const counterpartyId = direction === "sent" ? r.to_user_id : r.from_user_id
    return {
      id: r.id,
      direction,
      status: r.status,
      createdAt: r.created_at,
      eventTitle: r.order_item?.ticket_types?.events?.title ?? "Event",
      ticketTypeName: r.order_item?.ticket_types?.name ?? null,
      counterpartyId,
      counterpartyName: namesById.get(counterpartyId) ?? "Friend",
      canCancel:
        direction === "sent" && (r.status === "pending" || r.status === "requested"),
    }
  })
}
