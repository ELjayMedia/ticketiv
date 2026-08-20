import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export type TicketAssignmentState = "me" | "pending" | "assigned" | "unavailable"

export interface TicketAssignmentItem {
  id: string
  ticketTypeName: string
  state: TicketAssignmentState
  recipientName: string | null
  canAssign: boolean
  reason: string | null
}

export interface OrderTicketAssignment {
  orderId: string
  eventTitle: string
  eventSlug: string | null
  orderStatus: string
  ticketCount: number
  items: TicketAssignmentItem[]
}

type RawOrderItem = {
  id: string
  status: string
  current_owner_id: string | null
  checked_in_at: string | null
  revoked_at: string | null
  refunded_at: string | null
  ticket_types: {
    name: string | null
    events: {
      title: string | null
      slug: string | null
    } | null
  } | null
}

type RawTransfer = {
  id: string
  order_item_id: string | null
  to_user_id: string | null
  status: string
  expires_at: string | null
  created_at: string | null
}

function isLiveTransfer(transfer: RawTransfer | undefined): boolean {
  if (!transfer) return false
  if (transfer.status !== "pending" && transfer.status !== "requested") return false
  if (!transfer.expires_at) return true
  return new Date(transfer.expires_at).getTime() > Date.now()
}

function unavailableReason(orderStatus: string, item: RawOrderItem): string | null {
  if (orderStatus !== "paid") return "Payment is not complete"
  if (item.checked_in_at) return "Already checked in"
  if (item.revoked_at) return "Ticket revoked"
  if (item.refunded_at) return "Ticket refunded"
  if (item.status !== "issued" && item.status !== "transferred") return "Ticket is not transferable"
  if (!item.current_owner_id) return "Ticket ownership is unavailable"
  return null
}

/**
 * Post-purchase assignment model for the original buyer.
 *
 * The caller is first verified against orders.buyer_id. Only after that check
 * do we use the server-only admin client to keep every originally purchased
 * order_item visible even after one has moved to another current owner.
 * Transfer history is limited to requests initiated by this buyer, so this
 * page never exposes later recipient-to-recipient social activity.
 */
export async function getOrderTicketAssignment(
  orderId: string,
): Promise<OrderTicketAssignment | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.is_anonymous) return null

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, status, buyer_id")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .maybeSingle()

  if (orderError || !order) return null

  const admin = createAdminClient()
  const { data: itemData, error: itemError } = await admin
    .from("order_items")
    .select(
      `
        id,
        status,
        current_owner_id,
        checked_in_at,
        revoked_at,
        refunded_at,
        ticket_types(
          name,
          events(title, slug)
        )
      `,
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true })

  if (itemError) {
    console.error("[ticket-assignment] order_items:", itemError)
    return null
  }

  const rawItems = (itemData ?? []) as unknown as RawOrderItem[]
  const itemIds = rawItems.map((item) => item.id)

  let rawTransfers: RawTransfer[] = []
  if (itemIds.length > 0) {
    const { data: transferData, error: transferError } = await admin
      .from("transfers")
      .select("id, order_item_id, to_user_id, status, expires_at, created_at")
      .eq("from_user_id", user.id)
      .in("order_item_id", itemIds)
      .order("created_at", { ascending: false })

    if (transferError) {
      console.error("[ticket-assignment] transfers:", transferError)
    } else {
      rawTransfers = (transferData ?? []) as unknown as RawTransfer[]
    }
  }

  const latestByItem = new Map<string, RawTransfer>()
  for (const transfer of rawTransfers) {
    if (transfer.order_item_id && !latestByItem.has(transfer.order_item_id)) {
      latestByItem.set(transfer.order_item_id, transfer)
    }
  }

  const recipientIds = Array.from(
    new Set(
      rawTransfers
        .map((transfer) => transfer.to_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const recipientNames = new Map<string, string>()

  if (recipientIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name, name, surname")
      .in("user_id", recipientIds)

    for (const profile of profiles ?? []) {
      const fallback = [profile.name, profile.surname].filter(Boolean).join(" ").trim()
      recipientNames.set(profile.user_id, profile.display_name?.trim() || fallback || "Ticketiv user")
    }
  }

  const items: TicketAssignmentItem[] = rawItems.map((item) => {
    const reason = unavailableReason(order.status, item)
    const latest = latestByItem.get(item.id)
    const recipientName = latest?.to_user_id
      ? recipientNames.get(latest.to_user_id) ?? "Ticketiv user"
      : null

    if (reason) {
      return {
        id: item.id,
        ticketTypeName: item.ticket_types?.name ?? "Ticket",
        state: "unavailable",
        recipientName,
        canAssign: false,
        reason,
      }
    }

    if (item.current_owner_id === user.id) {
      if (isLiveTransfer(latest)) {
        return {
          id: item.id,
          ticketTypeName: item.ticket_types?.name ?? "Ticket",
          state: "pending",
          recipientName,
          canAssign: false,
          reason: null,
        }
      }

      return {
        id: item.id,
        ticketTypeName: item.ticket_types?.name ?? "Ticket",
        state: "me",
        recipientName: null,
        canAssign: true,
        reason: null,
      }
    }

    const stillWithBuyerSelectedRecipient =
      Boolean(latest?.to_user_id) &&
      latest?.to_user_id === item.current_owner_id &&
      (latest.status === "completed" || latest.status === "accepted")

    return {
      id: item.id,
      ticketTypeName: item.ticket_types?.name ?? "Ticket",
      state: "assigned",
      recipientName: stillWithBuyerSelectedRecipient ? recipientName : null,
      canAssign: false,
      reason: null,
    }
  })

  const firstEvent = rawItems[0]?.ticket_types?.events ?? null

  return {
    orderId: order.id,
    eventTitle: firstEvent?.title ?? "Your event",
    eventSlug: firstEvent?.slug ?? null,
    orderStatus: order.status,
    ticketCount: items.length,
    items,
  }
}
