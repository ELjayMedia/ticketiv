import { createServerSupabaseClient } from "@/lib/supabase"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import {
  DEMO_ORDERS,
  DEMO_ORDER_ITEMS,
  DEMO_TICKET_TYPES,
  getDemoUserTickets,
  getDemoTicketDetail,
} from "@/lib/demo-data"
import type { OrderRecord, OrderItemRecord } from "@/types"

export async function getUserTickets(userId: string): Promise<
  Array<{
    id: string
    order_id: string
    event_id: string
    ticket_type_id: string
    quantity: number
    unit_price_cents: number
    total_amount_cents: number
    ticket_code: string
    checked_in_at: string | null
    created_at: string
    event: {
      title: string
      starts_at: string
    } | null
    ticket_type: {
      name: string
      price: number
    } | null
  }>
> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession && demoSession.id === userId) {
    return getDemoUserTickets(userId)
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
      *,
      event:events(title, starts_at),
      ticket_type:ticket_types(name, price)
    `,
    )
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return data || []
}

export async function getTicketById(ticketId: string): Promise<{
  id: string
  order_id: string
  event_id: string
  ticket_type_id: string
  quantity: number
  unit_price_cents: number
  total_amount_cents: number
  ticket_code: string
  checked_in_at: string | null
  created_at: string
  event: any
  ticket_type: any
  order: any
} | null> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession) {
    return getDemoTicketDetail(ticketId)
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
      *,
      event:events(*),
      ticket_type:ticket_types(*),
      order:orders(*)
    `,
    )
    .eq("id", ticketId)
    .single()

  if (error || !data) return null

  return data
}

export async function getUserOrders(userId: string): Promise<
  Array<
    OrderRecord & {
      order_items: OrderItemRecord[]
    }
  >
> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession && demoSession.id === userId) {
    return DEMO_ORDERS.filter((o) => o.buyer_id === userId).map((order) => ({
      ...order,
      order_items: DEMO_ORDER_ITEMS.filter((i) => i.order_id === order.id),
    })) as any
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items(*)
    `,
    )
    .eq("purchaser_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data || []) as any
}

export async function getEventOrders(eventId: string): Promise<
  Array<
    OrderRecord & {
      order_items: OrderItemRecord[]
    }
  >
> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession) {
    return DEMO_ORDERS.filter((o) => o.event_id === eventId).map((order) => ({
      ...order,
      order_items: DEMO_ORDER_ITEMS.filter((i) => i.order_id === order.id),
    })) as any
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items(*)
    `,
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data || []) as any
}

export async function createOrder(orderData: {
  event_id: string
  purchaser_id: string
  purchaser_email: string
  purchaser_first_name?: string
  purchaser_last_name?: string
  items: Array<{
    ticket_type_id: string
    quantity: number
  }>
}): Promise<{ order: OrderRecord; items: OrderItemRecord[] }> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession) {
    // Create mock order
    const mockOrder: OrderRecord = {
      id: `demo-order-${Date.now()}`,
      event_id: orderData.event_id,
      purchaser_id: orderData.purchaser_id,
      purchaser_email: orderData.purchaser_email,
      purchaser_first_name: orderData.purchaser_first_name || null,
      purchaser_last_name: orderData.purchaser_last_name || null,
      status: "completed",
      subtotal_amount: 0,
      fee_amount: 0,
      total_amount: 0,
      currency: "USD",
      payment_reference: null,
      metadata: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const mockItems: OrderItemRecord[] = orderData.items.map((item, idx) => {
      const ticketType = DEMO_TICKET_TYPES.find((t) => t.id === item.ticket_type_id)
      const unitPrice = ticketType?.price_cents || 0

      return {
        id: `demo-item-${Date.now()}-${idx}`,
        order_id: mockOrder.id,
        event_id: orderData.event_id,
        ticket_type_id: item.ticket_type_id,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal_amount: unitPrice * item.quantity,
        fee_amount: 0,
        total_amount: unitPrice * item.quantity,
        currency: "USD",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    mockOrder.total_amount = mockItems.reduce((sum, item) => sum + item.total_amount, 0)
    mockOrder.subtotal_amount = mockOrder.total_amount

    return { order: mockOrder, items: mockItems }
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()

  // Calculate totals
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("*")
    .in(
      "id",
      orderData.items.map((i) => i.ticket_type_id),
    )

  const subtotal = orderData.items.reduce((sum, item) => {
    const ticketType = ticketTypes?.find((t) => t.id === item.ticket_type_id)
    return sum + (ticketType?.price || 0) * item.quantity
  }, 0)

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      event_id: orderData.event_id,
      purchaser_id: orderData.purchaser_id,
      purchaser_email: orderData.purchaser_email,
      purchaser_first_name: orderData.purchaser_first_name,
      purchaser_last_name: orderData.purchaser_last_name,
      status: "pending",
      subtotal_amount: subtotal,
      fee_amount: 0,
      total_amount: subtotal,
      currency: "USD",
    })
    .select()
    .single()

  if (orderError || !order) throw orderError

  // Create order items
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .insert(
      orderData.items.map((item) => {
        const ticketType = ticketTypes?.find((t) => t.id === item.ticket_type_id)
        const unitPrice = ticketType?.price || 0

        return {
          order_id: order.id,
          event_id: orderData.event_id,
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
          unit_price: unitPrice,
          subtotal_amount: unitPrice * item.quantity,
          fee_amount: 0,
          total_amount: unitPrice * item.quantity,
          currency: "USD",
        }
      }),
    )
    .select()

  if (itemsError || !items) throw itemsError

  return { order, items }
}
