import "server-only"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { calculateOrderPricing, type FeeConfiguration, type OrderPricingBreakdown } from "@/lib/pricing"
import type {
  OrderItemRecord,
  OrderRecord,
  TicketRecord,
  TicketTypeRecord,
  EventRecord,
} from "@/types"

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
  feeConfiguration?: Partial<FeeConfiguration>
}

export interface CreateOrderResult {
  order: OrderRecord
  items: OrderItemRecord[]
  pricing: OrderPricingBreakdown
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

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  if (!input.items || input.items.length === 0) {
    throw new Error("At least one order item is required")
  }

  const supabase = createServerSupabaseClient()
  const ticketTypeIds = input.items.map((item) => item.ticketTypeId)

  const { data: ticketTypes, error: ticketTypesError } = await supabase
    .from("ticket_types")
    .select("*")
    .in("id", ticketTypeIds)

  if (ticketTypesError) {
    console.error("Failed to load ticket types", ticketTypesError)
    throw new Error("Unable to load ticket types")
  }

  const ticketTypeMap = new Map<string, TicketTypeRecord>()
  for (const ticketType of ticketTypes ?? []) {
    ticketTypeMap.set(ticketType.id, ticketType as TicketTypeRecord)
  }

  const lineItems = input.items.map((item) => {
    const ticketType = ticketTypeMap.get(item.ticketTypeId)
    if (!ticketType) {
      throw new Error("Ticket type not found")
    }
    const requestedQuantity = Math.max(1, Math.floor(item.quantity))
    if (
      typeof ticketType.quantity_remaining === "number" &&
      ticketType.quantity_remaining >= 0 &&
      requestedQuantity > ticketType.quantity_remaining
    ) {
      throw new Error(`Only ${ticketType.quantity_remaining} tickets remaining for ${ticketType.name}`)
    }
    return { ticketType, quantity: requestedQuantity }
  })

  const pricing = calculateOrderPricing({
    items: lineItems,
    feeConfiguration: input.feeConfiguration,
    currency: lineItems[0]?.ticketType.currency,
  })

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      event_id: input.eventId,
      purchaser_id: input.purchaserId,
      purchaser_email: input.purchaserEmail,
      purchaser_first_name: input.purchaserFirstName ?? null,
      purchaser_last_name: input.purchaserLastName ?? null,
      status: "completed",
      subtotal_amount: pricing.subtotal,
      fee_amount: pricing.fees,
      total_amount: pricing.total,
      currency: pricing.currency,
      payment_reference: input.paymentReference ?? null,
      metadata: input.metadata ?? null,
    })
    .select("*")
    .single()

  if (orderError) {
    console.error("Failed to create order", orderError)
    throw new Error("Unable to create order")
  }

  const orderItemsPayload = pricing.lineItems.map((lineItem, index) => {
    const { ticketType } = lineItems[index]
    return {
      order_id: order.id,
      event_id: input.eventId,
      ticket_type_id: ticketType.id,
      quantity: lineItem.quantity,
      unit_price: lineItem.unitPrice,
      subtotal_amount: lineItem.subtotal,
      fee_amount: lineItem.fees,
      total_amount: lineItem.total,
      currency: pricing.currency,
    }
  })

  const { data: createdItems, error: orderItemsError } = await supabase
    .from("order_items")
    .insert(orderItemsPayload)
    .select("*")

  if (orderItemsError) {
    console.error("Failed to create order items", orderItemsError)
    throw new Error("Unable to create order items")
  }

  await Promise.all(
    (createdItems ?? []).map(async (item) => {
      const { error: mintError } = await supabase.rpc("fn_mint_tickets", {
        order_item_id: item.id,
        quantity: item.quantity,
      })

      if (mintError) {
        console.error("Failed to mint tickets", mintError)
        throw new Error("Unable to mint tickets")
      }
    }),
  )

  return {
    order: order as OrderRecord,
    items: (createdItems ?? []) as OrderItemRecord[],
    pricing,
  }
}

export async function getOrdersForUser(userId: string): Promise<UserOrder[]> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
      order_items:order_items(*, ticket_type:ticket_types(*), tickets:tickets(*)),
      event:events(*)
    `,
    )
    .eq("purchaser_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Failed to load user orders", error)
    throw new Error("Unable to load orders")
  }

  return (data ?? []) as UserOrder[]
}

export async function getOrderById(orderId: string): Promise<UserOrder | null> {
  const supabase = createServerSupabaseClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
      order_items:order_items(*, ticket_type:ticket_types(*), tickets:tickets(*)),
      event:events(*)
    `,
    )
    .eq("id", orderId)
    .maybeSingle()

  if (error && error.code !== "PGRST116") {
    console.error("Failed to load order", error)
    throw new Error("Unable to load order")
  }

  return (data as UserOrder) ?? null
}
