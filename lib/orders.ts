import type { SupabaseClient } from "@supabase/supabase-js"

import { MOCK_EVENTS } from "./mock-data"
import { calculatePricing } from "./pricing"
import { createServerSupabaseClient } from "./supabase-server"

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

type SupabaseDB = SupabaseClient<any, "public", any>

interface OrderRow {
  id: string
  event_id: string
  event_title: string
  attendee_name: string
  attendee_email: string
  quantity: number
  pricing_subtotal: number
  pricing_fees: number
  pricing_total: number
  pricing_currency: string
  created_at: string
}

interface OrderItemRow {
  id: string
  order_id: string
  code: string
  event_id: string
  scanned_at: string | null
}

export interface UserOrder extends OrderRecord {
  order_items: UserOrderItem[]
  event?: EventRecord | null
}

function mapTicket(ticket: OrderItemRow): TicketRecord {
  return {
    code: ticket.code,
    eventId: ticket.event_id,
    scannedAt: ticket.scanned_at ?? undefined,
  }
}

function mapOrder(order: OrderRow, tickets: OrderItemRow[]): OrderRecord {
  return {
    id: order.id,
    eventId: order.event_id,
    eventTitle: order.event_title,
    attendeeName: order.attendee_name,
    attendeeEmail: order.attendee_email,
    quantity: order.quantity,
    pricing: {
      subtotal: order.pricing_subtotal,
      fees: order.pricing_fees,
      total: order.pricing_total,
      currency: order.pricing_currency,
    },
    tickets: tickets.map(mapTicket),
    createdAt: order.created_at,
  }
}

async function getOrderWithTickets(supabase: SupabaseDB, orderId: string): Promise<OrderRecord | null> {
  const { data: orderRow, error } = await supabase.from<OrderRow>("orders").select("*").eq("id", orderId).maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  if (!orderRow) {
    return null
  }

  const { data: ticketRows, error: ticketError } = await supabase.from<OrderItemRow>("order_items").select("*").eq("order_id", orderRow.id)
  if (ticketError) {
    throw new Error(ticketError.message)
  }

  return mapOrder(orderRow, ticketRows ?? [])
}

async function getTicketsByOrderIds(
  supabase: SupabaseDB,
  orderIds: string[],
): Promise<Record<string, OrderItemRow[]>> {
  if (!orderIds.length) {
    return {}
  }

  const { data: rows, error } = await supabase
    .from<OrderItemRow>("order_items")
    .select("*")
    .in("order_id", orderIds)

  if (error) {
    throw new Error(error.message)
  }

  return (rows ?? []).reduce<Record<string, OrderItemRow[]>>((acc, ticket) => {
    if (!acc[ticket.order_id]) {
      acc[ticket.order_id] = []
    }
    acc[ticket.order_id].push(ticket)
    return acc
  }, {})
}

export async function createOrder(input: OrderInput): Promise<OrderRecord> {
  const event = MOCK_EVENTS.find((item) => item.id === input.eventId)
  if (!event) {
    throw new Error("Event not found")
  }

  const supabase = createServerSupabaseClient()
  const pricing = calculatePricing({ eventId: input.eventId, quantity: input.quantity })
  const { data: orderRow, error } = await supabase
    .from<OrderRow>("orders")
    .insert({
      event_id: input.eventId,
      event_title: event.title,
      attendee_name: input.attendeeName,
      attendee_email: input.attendeeEmail,
      quantity: input.quantity,
      pricing_subtotal: pricing.subtotal,
      pricing_fees: pricing.fees,
      pricing_total: pricing.total,
      pricing_currency: pricing.currency,
    })
    .select("*")
    .single()

  if (error || !orderRow) {
    throw new Error(error?.message ?? "Unable to store order")
  }

  const { data: ticketRows, error: ticketError } = await supabase
    .from<OrderItemRow>("order_items")
    .insert(
      Array.from({ length: input.quantity }, (_, index) => ({
        order_id: orderRow.id,
        code: generateId(`TICKET-${index + 1}`),
        event_id: input.eventId,
        scanned_at: null,
      })),
    )
    .select("*")

  if (ticketError) {
    throw new Error(ticketError.message)
  }

  return mapOrder(orderRow, ticketRows ?? [])
}

export async function listOrders(): Promise<OrderRecord[]> {
  const supabase = createServerSupabaseClient()
  const { data: orderRows, error } = await supabase
    .from<OrderRow>("orders")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const orderIds = (orderRows ?? []).map((order) => order.id)
  const ticketsByOrder = await getTicketsByOrderIds(supabase, orderIds)

  return (orderRows ?? []).map((order) => mapOrder(order, ticketsByOrder[order.id] ?? []))
}

export async function getOrdersByEmail(email: string): Promise<OrderRecord[]> {
  const orders = await listOrders()
  return orders.filter((order) => order.attendeeEmail.toLowerCase() === email.toLowerCase())
}

export async function findTicketByCode(
  code: string,
): Promise<{ order: OrderRecord; ticket: TicketRecord } | null> {
  const supabase = createServerSupabaseClient()
  const { data: ticketRow, error } = await supabase
    .from<OrderItemRow>("order_items")
    .select("*")
    .eq("code", code)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!ticketRow) {
    return null
  }

  const order = await getOrderWithTickets(supabase, ticketRow.order_id)
  if (!order) {
    return null
  }

  const ticket = order.tickets.find((item) => item.code === code) ?? mapTicket(ticketRow)
  if (!order.tickets.some((item) => item.code === ticket.code)) {
    order.tickets.push(ticket)
  }

  return { order, ticket }
}

export async function markTicketScanned(
  code: string,
): Promise<{ order: OrderRecord; ticket: TicketRecord } | null> {
  const supabase = createServerSupabaseClient()
  const scannedAt = new Date().toISOString()

  const { data: updatedTicket, error } = await supabase
    .from<OrderItemRow>("order_items")
    .update({ scanned_at: scannedAt })
    .eq("code", code)
    .select("*")
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!updatedTicket) {
    return null
  }

  const order = await getOrderWithTickets(supabase, updatedTicket.order_id)
  if (!order) {
    return null
  }

  const ticket = order.tickets.find((item) => item.code === code) ?? mapTicket(updatedTicket)
  ticket.scannedAt = scannedAt

  return { order, ticket }
}
