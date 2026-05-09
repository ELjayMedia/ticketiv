import "server-only"

import { randomUUID } from "crypto"

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

type LiveTicketType = {
  id: string
  event_id: string
  name: string
  price_cents: number
  currency: string
  quota: number
  events: { org_id: string } | { org_id: string }[] | null
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

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
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

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.items || input.items.length === 0) {
    throw new Error("At least one order item is required")
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")

  const ticketTypeIds = Array.from(new Set(input.items.map((item) => item.ticketTypeId)))

  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from("ticket_types")
    .select("id, event_id, name, price_cents, currency, quota, events!inner(org_id)")
    .in("id", ticketTypeIds)

  if (ticketTypesError) {
    console.error("Failed to load ticket types", ticketTypesError)
    throw new Error("Unable to load ticket types")
  }

  const ticketTypeMap = new Map<string, LiveTicketType>()
  for (const ticketType of ticketTypes ?? []) {
    const typed = ticketType as LiveTicketType
    if (typed.event_id !== input.eventId) {
      throw new Error("Ticket type does not belong to this event")
    }
    ticketTypeMap.set(typed.id, typed)
  }

  const lineItems = input.items.map((item) => {
    const ticketType = ticketTypeMap.get(item.ticketTypeId)
    if (!ticketType) throw new Error("Ticket type not found")

    const quantity = normalizeQuantity(item.quantity)
    return { ticketType, quantity }
  })

  const firstTicketType = lineItems[0]?.ticketType
  const orgId = firstRelation(firstTicketType?.events)?.org_id
  if (!firstTicketType || !orgId) throw new Error("Unable to resolve event organizer")

  const currency = firstTicketType.currency || "SZL"
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.ticketType.price_cents * item.quantity, 0)
  const platformFeeCents = 0
  const processorFeeCents = 0
  const totalCents = subtotalCents + platformFeeCents + processorFeeCents
  const itemCount = lineItems.reduce((sum, item) => sum + item.quantity, 0)

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      org_id: orgId,
      buyer_id: input.purchaserId,
      email: input.purchaserEmail,
      buyer_email: input.purchaserEmail,
      total_cents: totalCents,
      subtotal_cents: subtotalCents,
      item_count: itemCount,
      platform_fee_cents: platformFeeCents,
      processor_fee_cents: processorFeeCents,
      currency,
      order_currency: currency,
      order_price_cents: subtotalCents,
      order_platform_fee_cents: platformFeeCents,
      order_processor_fee_cents: processorFeeCents,
      status: "pending",
      channel: "online",
    })
    .select("*")
    .single<LiveOrder>()

  if (orderError || !order) {
    console.error("Failed to create pending order", orderError)
    throw new Error("Unable to create order")
  }

  const holderName = buildHolderName(input)
  const orderItemsPayload = lineItems.flatMap(({ ticketType, quantity }) =>
    Array.from({ length: quantity }, () => ({
      order_id: order.id,
      ticket_type_id: ticketType.id,
      ticket_code: randomUUID(),
      status: "pending",
      holder_name: holderName,
      holder_email: input.purchaserEmail,
    })),
  )

  const { data: createdItems, error: orderItemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload)
    .select("*")

  if (orderItemsError) {
    console.error("Failed to create pending order items", orderItemsError)
    throw new Error("Unable to create order items")
  }

  return {
    order: order as unknown as OrderRecord,
    items: (createdItems ?? []) as unknown as OrderItemRecord[],
    pricing: {
      subtotal: centsToMajor(subtotalCents),
      fees: centsToMajor(platformFeeCents + processorFeeCents),
      total: centsToMajor(totalCents),
      currency,
      lineItems: lineItems.map(({ ticketType, quantity }) => ({
        ticketTypeId: ticketType.id,
        quantity,
        unitPrice: centsToMajor(ticketType.price_cents),
        subtotal: centsToMajor(ticketType.price_cents * quantity),
        fees: 0,
        total: centsToMajor(ticketType.price_cents * quantity),
      })),
    },
  }
}

export async function completePaidOrder(orderId: string, paymentReference?: string | null): Promise<CompletePaidOrderResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase is not configured")

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
      org:organizations(*)
    `,
    )
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load user orders", error)
    throw new Error("Unable to load orders")
  }

  return (data ?? []) as unknown as UserOrder[]
}

export async function getOrderById(orderId: string): Promise<UserOrder | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
      order_items:order_items(*, ticket_type:ticket_types(*)),
      org:organizations(*)
    `,
    )
    .eq("id", orderId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error("Failed to load order", error)
    throw new Error("Unable to load order")
  }

  return (data as unknown as UserOrder) ?? null
}
