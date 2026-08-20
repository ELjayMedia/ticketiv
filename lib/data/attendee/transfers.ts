"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export type TransferStatus =
  | "requested"
  | "pending"
  | "accepted"
  | "declined"
  | "cancelled"
  | "completed"
  | "expired"

export type TransferDisplayStatus = TransferStatus

export interface Transfer {
  id: string
  order_item_id: string | null
  from_user_id: string | null
  to_user_id: string | null
  status: TransferStatus
  metadata: unknown
  created_at: string | null
  updated_at: string | null
  expires_at: string
}

export interface TransferMutationResult {
  transfer_id: string
  order_item_id?: string
  to_user_id?: string
  new_owner_id?: string
  status: "pending" | "completed" | "declined" | "cancelled" | "expired"
  expires_at?: string
}

export interface TransferRecipientLookup {
  userId: string
  displayName: string
  handle: string | null
  matchKind: "handle" | "email" | "phone"
}

function isExpired(status: TransferStatus, expiresAt: string | null | undefined): boolean {
  if (status === "expired") return true
  if (status !== "pending" && status !== "requested") return false
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
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
  return (data ?? []) as Transfer[]
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
  return ((data ?? []) as Transfer[]).filter((row) => !isExpired(row.status, row.expires_at))
}

export async function lookupTransferRecipient(
  identifier: string,
): Promise<TransferRecipientLookup | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_lookup_transfer_recipient", {
    p_identifier: identifier,
  })

  if (error) {
    console.error("[transfers] lookupTransferRecipient:", error)
    return null
  }

  const row = (Array.isArray(data) ? data[0] : null) as
    | {
        user_id: string
        display_name: string
        handle: string | null
        match_kind: "handle" | "email" | "phone"
      }
    | undefined

  if (!row) return null
  return {
    userId: row.user_id,
    displayName: row.display_name,
    handle: row.handle,
    matchKind: row.match_kind,
  }
}

export async function requestTransfer(
  orderItemId: string,
  toUserId: string,
): Promise<TransferMutationResult | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_request_transfer_to_user", {
    p_order_item_id: orderItemId,
    p_recipient_user_id: toUserId,
  })

  if (error) {
    console.error("[transfers] requestTransfer:", error)
    return null
  }
  return data as TransferMutationResult
}

export async function requestTransferByEmail(
  orderItemId: string,
  email: string,
): Promise<TransferMutationResult | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_request_transfer_by_email", {
    p_order_item_id: orderItemId,
    p_recipient_email: email,
  })

  if (error) {
    console.error("[transfers] requestTransferByEmail:", error)
    return null
  }
  return data as TransferMutationResult
}

export async function requestTransferByPhone(
  orderItemId: string,
  phone: string,
): Promise<TransferMutationResult | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_request_transfer_by_phone", {
    p_order_item_id: orderItemId,
    p_recipient_phone: phone,
  })

  if (error) {
    console.error("[transfers] requestTransferByPhone:", error)
    return null
  }
  return data as TransferMutationResult
}

export async function acceptTransfer(
  transferId: string,
): Promise<TransferMutationResult | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_complete_transfer", {
    p_transfer_id: transferId,
  })

  if (error) {
    console.error("[transfers] acceptTransfer:", error)
    return null
  }
  return data as TransferMutationResult
}

export async function declineTransfer(
  transferId: string,
  reason?: string,
): Promise<TransferMutationResult | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_decline_transfer", {
    p_transfer_id: transferId,
    p_reason: reason ?? null,
  })

  if (error) {
    console.error("[transfers] declineTransfer:", error)
    return null
  }
  return data as TransferMutationResult
}

export async function cancelTransfer(
  transferId: string,
): Promise<TransferMutationResult | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await (supabase.rpc as any)("fn_cancel_transfer", {
    p_transfer_id: transferId,
  })

  if (error) {
    console.error("[transfers] cancelTransfer:", error)
    return null
  }
  return data as TransferMutationResult
}

export type TransferHistoryDirection = "sent" | "received"

export interface TransferHistoryItem {
  id: string
  direction: TransferHistoryDirection
  status: TransferDisplayStatus
  createdAt: string
  expiresAt: string | null
  eventTitle: string
  ticketTypeName: string | null
  counterpartyId: string
  counterpartyName: string
  canCancel: boolean
  canAccept: boolean
  canDecline: boolean
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
        id, from_user_id, to_user_id, status, created_at, expires_at,
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
    status: TransferStatus
    created_at: string
    expires_at: string | null
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

  const namesById = new Map<string, string>()
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
      namesById.set((p as { user_id: string }).user_id, display || "Ticketiv user")
    }
  }

  return raw.map((r): TransferHistoryItem => {
    const direction: TransferHistoryDirection =
      r.from_user_id === user.id ? "sent" : "received"
    const counterpartyId = direction === "sent" ? r.to_user_id : r.from_user_id
    const status: TransferDisplayStatus = isExpired(r.status, r.expires_at) ? "expired" : r.status
    const isLive = status === "pending" || status === "requested"

    return {
      id: r.id,
      direction,
      status,
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      eventTitle: r.order_item?.ticket_types?.events?.title ?? "Event",
      ticketTypeName: r.order_item?.ticket_types?.name ?? null,
      counterpartyId,
      counterpartyName: namesById.get(counterpartyId) ?? "Ticketiv user",
      canCancel: direction === "sent" && isLive,
      canAccept: direction === "received" && isLive,
      canDecline: direction === "received" && isLive,
    }
  })
}
