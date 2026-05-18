import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { OrderItemRecord, OrderRecord, TicketRecord, TicketTypeRecord, EventRecord } from "@/types"

export interface CreateOrderItemInput {
  ticketTypeId: string
  quantity: number
}

export interface CreateOrderInput {
  eventId: string
  purchaserId: string
  purchaserEmail: string
  purchaserFirstName?: string
  purchaserLastName?: string
  items: CreateOrderItemInput[]
  metadata?: Record<string, any>
  paymentReference?: string | null
}

export interface OrderPricingBreakdown {
  subtotal: number
  fees: number
  total: number
  currency: string
  lineItems: Array<{
    ticketTypeId: string
    quantity: number
    unitPrice: number
    subtotal: number
    fees: number
    total: number
  }>
}

export interface CreateOrderResult {
  order: OrderRecord
  items: OrderItemRecord[]
  pricing: OrderPricingBreakdown
}

export interface CompletePaidOrderResult {
  order: OrderRecord
  items: OrderItemRecord[]
}

export interface UserOrderItem extends OrderItemRecord {
  ticket_type?: TicketTypeRecord | null
  event?: EventRecord | null
  tickets?: TicketRecord[] | null
}

export interface UserOrder extends OrderRecord {
  order_items: UserOrderItem[]
  event?: EventRecord | null
}

type LiveOrder = {
  id: string
  org_id: string
  buyer_id: string
  total_cents: number
  currency: string
  status: "pending" | "paid" | "failed" | "refunded"
  created_at: string
  channel?: string | null
  email?: string | null
  phone?: string | null
  subtotal_cents?: number | null
  item_count?: number | null
  platform_fee_cents?: number | null
  processor_fee_cents?: number | null
  buyer_email?: string | null
  buyer_phone?: string | null
}

type RpcCreatedOrder = {
  order_row: LiveOrder
  order_items: OrderItemRecord[]
}

function centsToMajor(cents: number) {
  return Math.round(cents) / 100
}

function normalizeQuantity(quantity: number) {
  return Math.max(1, Math.floor(Number(quantity) || 1))
}

function buildHolderName(input: CreateOrderInput) {
  const name = [input.purchaserFirstName, input.purchaserLastName].filter(Boolean).join(" ").trim()
  return name.length > 0 ? name : null
}

function normalizeOrderError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "")

  if (message.includes("sold_out:")) {
    const ticketName = message.split("sold_out:")[1]?.split("\n")[0]?.trim()
    return ticketName ? `${ticketName} is sold out or does not have enough tickets left.` : "This ticket type is sold out."
  }

  if (message.includes("per_user_limit_exceeded:")) {
    const ticketName = message.split("per_user_limit_exceeded:")[1]?.split("\n")[0]?.trim()
    return ticketName ? `${ticketName} exceeds the per-order limit.` : "This order exceeds the ticket limit."
  }

  if (message.includes("ticket_type_not_on_sale:")) {
    const ticketName = message.split("ticket_type_not_on_sale:")[1]?.split("\n")[0]?.trim()
    return ticketName ? `${ticketName} is not currently on sale.` : "This ticket type is not currently on sale."
  }

  if (message.includes("event_not_available")) return "This event is not available for checkout."
  if (message.includes("ticket_type_not_found")) return "One or more selected ticket types are no longer available."
  if (message.includes("items_required")) return "At least one order item is required."

  return "Unable to create order"
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.items || input.items.length === 0) {
    throw new Error("At least one order item is required")
  }

  // This RPC is intentionally service-role only. It centralizes inventory locks,
  // quota checks, sales_status checks and pending ticket creation in Postgres,
  // while the API route remains responsible for authenticating the buyer first.
  const supabase = createAdminClient()

  const normalizedItems = input.items.map((item) => ({
    ticketTypeId: item.ticketTypeId,
    quantity: normalizeQuantity(item.quantity),
  }))

  const { data, error } = await supabase.rpc("fn_create_inventory_protected_order", {
    p_event_id: input.eventId,
    p_buyer_id: input.purchaserId,
    p_buyer_email: input.purchaserEmail,
    p_items: normalizedItems,
    p_holder_name: buildHolderName(input),
  })

  if (error) {
    console.error("Failed to create inventory-protected pending order", error)
    throw new Error(normalizeOrderError(error))
  }

  const result = Array.isArray(data) ? (data[0] as RpcCreatedOrder | undefined) : (data as RpcCreatedOrder | undefined)
  const order = result?.order_row
  const createdItems = result?.order_items ?? []

  if (!order) {
    console.error("Inventory-protected order RPC returned no order", data)
    throw new Error("Unable to create order")
  }

  const subtotalCents = order.subtotal_cents ?? order.total_cents ?? 0
  const platformFeeCents = order.platform_fee_cents ?? 0
  const processorFeeCents = order.processor_fee_cents ?? 0
  const totalCents = order.total_cents ?? subtotalCents + platformFeeCents + processorFeeCents
  const itemCount = order.item_count ?? createdItems.length
  const currency = order.currency || "SZL"

  return {
    order: order as unknown as OrderRecord,
    items: createdItems as unknown as OrderItemRecord[],
    pricing: {
      subtotal: centsToMajor(subtotalCents),
      fees: centsToMajor(platformFeeCents + processorFeeCents),
      total: centsToMajor(totalCents),
      currency,
      lineItems: normalizedItems.map((item) => ({
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitPrice: item.quantity > 0 ? centsToMajor(Math.round(subtotalCents / Math.max(itemCount, 1))) : 0,
        subtotal: 0,
        fees: 0,
        total: 0,
      })),
    },
  }
}

export async function completePaidOrder(orderId: string, paymentReference?: string | null): Promise<CompletePaidOrderResult> {
  // Payment completion can be called from trusted webhook/polling flows where
  // there is no buyer browser session. Use the service-role client here after
  // the payment provider has already been verified by the caller.
  const supabase = createAdminClient()

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle<LiveOrder>()

  if (orderError) {
    console.error("Failed to load order for completion", orderError)
    throw new Error("Unable to load order")
  }

  if (!order) throw new Error("Order not found")

  const { data: orderItems, error: orderItemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)

  if (orderItemsError) {
    console.error("Failed to load order items", orderItemsError)
    throw new Error("Unable to load order items")
  }

  if (order.status === "paid") {
    return { order: order as unknown as OrderRecord, items: (orderItems ?? []) as unknown as OrderItemRecord[] }
  }

  if (order.status !== "pending") {
    throw new Error(`Order cannot be completed from status: ${order.status}`)
  }

  const { error: issueItemsError } = await supabase
    .from("order_items")
    .update({ status: "issued" })
    .eq("order_id", order.id)
    .eq("status", "pending")

  if (issueItemsError) {
    console.error("Failed to issue paid tickets", issueItemsError)
    throw new Error("Unable to issue tickets")
  }

  const { data: completedOrder, error: completeError } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("*")
    .single<LiveOrder>()

  if (completeError || !completedOrder) {
    console.error("Failed to mark order as paid", completeError)
    throw new Error("Unable to complete order")
  }

  const { data: issuedItems, error: issuedItemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)

  if (issuedItemsError) {
    console.error("Failed to reload issued tickets", issuedItemsError)
    throw new Error("Unable to load issued tickets")
  }

  return {
    order: completedOrder as unknown as OrderRecord,
    items: (issuedItems ?? []) as unknown as OrderItemRecord[],
  }
}

export async function getOrdersForUser(userId: string): Promise<UserOrder[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
      order_items:order_items(*, ticket_type:ticket_types(*)),
      org:organizations(*)`
    )
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load user orders", error)
    return []
  }

  return (data ?? []) as unknown as UserOrder[]
}
