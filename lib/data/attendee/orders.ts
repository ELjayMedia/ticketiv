import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getDemoSessionFromCookie } from "@/lib/demo-auth"
import { DEMO_ORDERS, DEMO_ORDER_ITEMS } from "@/lib/demo-data"

export interface BuyerOrderItem {
  id: string
  ticket_code: string
  ticket_type_id: string
  ticket_type_name: string | null
  price_cents: number | null
  event_id: string
  event_title: string | null
  event_slug: string | null
  cover_image_url: string | null
  event_starts_at: string | null
  venue_name: string | null
}

export interface BuyerOrder {
  id: string
  status: string
  total_cents: number
  subtotal_cents: number | null
  platform_fee_cents: number | null
  currency: string
  created_at: string
  buyer_email: string | null
  items: BuyerOrderItem[]
  event_id: string | null
  refund_policy: unknown
}

/**
 * RLS-scoped order detail for the authenticated buyer. Joins v_my_tickets
 * (already buyer-scoped) with the orders row for headline totals, plus the
 * event's refund_policy column for the refund screen. Returns null when the
 * order does not exist or does not belong to the current user.
 */
export async function getOrderForBuyer(orderId: string): Promise<BuyerOrder | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [orderRes, ticketsRes] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, status, total_cents, subtotal_cents, platform_fee_cents, currency, created_at, buyer_email",
      )
      .eq("id", orderId)
      .eq("buyer_id", user.id)
      .maybeSingle(),
    supabase
      .from("v_my_tickets")
      .select(
        "order_item_id, ticket_code, ticket_type_id, ticket_type_name, price_cents, event_id, event_title, event_slug, cover_image_url, event_starts_at, venue_name",
      )
      .eq("order_id", orderId),
  ])

  if (orderRes.error || !orderRes.data) return null

  const items: BuyerOrderItem[] = (ticketsRes.data ?? []).map((row) => ({
    id: row.order_item_id,
    ticket_code: row.ticket_code,
    ticket_type_id: row.ticket_type_id ?? "",
    ticket_type_name: row.ticket_type_name,
    price_cents: row.price_cents,
    event_id: row.event_id,
    event_title: row.event_title,
    event_slug: row.event_slug,
    cover_image_url: row.cover_image_url,
    event_starts_at: row.event_starts_at,
    venue_name: row.venue_name,
  }))

  const eventId = items[0]?.event_id ?? null
  let refundPolicy: unknown = null
  if (eventId) {
    const { data } = await supabase
      .from("events")
      .select("refund_policy")
      .eq("id", eventId)
      .maybeSingle()
    refundPolicy = data?.refund_policy ?? null
  }

  return {
    id: orderRes.data.id,
    status: orderRes.data.status,
    total_cents: orderRes.data.total_cents,
    subtotal_cents: orderRes.data.subtotal_cents,
    platform_fee_cents: orderRes.data.platform_fee_cents,
    currency: orderRes.data.currency,
    created_at: orderRes.data.created_at,
    buyer_email: orderRes.data.buyer_email,
    items,
    event_id: eventId,
    refund_policy: refundPolicy,
  }
}

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
    return DEMO_ORDER_ITEMS.filter((i) => i.buyer_id === userId)
  }

  // Production mode - Supabase
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from("order_items")
    .select(
      `
      *,
      ticket_types(name, price_cents, event_id),
      orders!inner(buyer_id)
    `,
    )
    .eq("orders.buyer_id", userId)
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
    return DEMO_ORDER_ITEMS.find((i) => i.id === ticketId)
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
  Array<{
    id: string
    event_id: string
    purchaser_id: string
    purchaser_email: string
    purchaser_first_name?: string
    purchaser_last_name?: string
    status: string
    subtotal_amount: number
    fee_amount: number
    total_amount: number
    currency: string
    payment_reference: string | null
    metadata: any | null
    created_at: string
    updated_at: string
    order_items: Array<{
      id: string
      order_id: string
      event_id: string
      ticket_type_id: string
      quantity: number
      unit_price: number
      subtotal_amount: number
      fee_amount: number
      total_amount: number
      currency: string
      created_at: string
      updated_at: string
    }>
  }>
> {
  const demoSession = await getDemoSessionFromCookie()

  // Demo mode
  if (demoSession && demoSession.id === userId) {
    return DEMO_ORDERS.filter((o) => o.buyer_id === userId).map((order) => ({
      ...order,
      order_items: DEMO_ORDER_ITEMS.filter((i) => i.order_id === order.id),
    }))
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
    .eq("buyer_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error

  return data || []
}

export async function getEventOrders(
  eventId: string,
  filters?: { status?: string; search?: string },
): Promise<
  Array<{
    id: string
    event_id: string
    purchaser_id: string
    purchaser_email: string
    purchaser_first_name?: string
    purchaser_last_name?: string
    status: string
    subtotal_amount: number
    fee_amount: number
    total_amount: number
    currency: string
    payment_reference: string | null
    metadata: any | null
    created_at: string
    updated_at: string
    order_items: Array<{
      id: string
      order_id: string
      event_id: string
      ticket_type_id: string
      quantity: number
      unit_price: number
      subtotal_amount: number
      fee_amount: number
      total_amount: number
      currency: string
      created_at: string
      updated_at: string
    }>
  }>
> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    let orders = DEMO_ORDERS.filter((o) => o.event_id === eventId)
    if (filters?.status) {
      orders = orders.filter((o) => o.status === filters.status)
    }
    return orders.map((order) => ({
      ...order,
      order_items: DEMO_ORDER_ITEMS.filter((i) => i.order_id === order.id),
    }))
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  let query = supabase
    .from("orders")
    .select(`
      *,
      order_items!inner(*, ticket_types!inner(event_id))
    `)
    .eq("order_items.ticket_types.event_id", eventId)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  const { data, error } = await query.order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getOrderPayments(orderId: string): Promise<
  Array<{
    id: string
    order_id: string
    amount: number
    currency: string
    status: string
    created_at: string
    updated_at: string
  }>
> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return []
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function createOrder(input: {
  event_id: string
  items: Array<{ ticket_type_id: string; quantity: number }>
  purchaser_email: string
  promo_code?: string
  channel?: string
}): Promise<{
  order: {
    id: string
    event_id: string
    purchaser_id: string
    purchaser_email: string
    purchaser_first_name?: string
    purchaser_last_name?: string
    status: string
    subtotal_amount: number
    fee_amount: number
    total_amount: number
    currency: string
    payment_reference: string | null
    metadata: any | null
    created_at: string
    updated_at: string
  }
  items: Array<{
    id: string
    order_id: string
    event_id: string
    ticket_type_id: string
    quantity: number
    unit_price: number
    subtotal_amount: number
    fee_amount: number
    total_amount: number
    currency: string
    created_at: string
    updated_at: string
  }>
}> {
  // Always call API route for order creation (server-authoritative)
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  })

  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getOrderById(orderId: string): Promise<{
  id: string
  event_id: string
  purchaser_id: string
  purchaser_email: string
  purchaser_first_name?: string
  purchaser_last_name?: string
  status: string
  subtotal_amount: number
  fee_amount: number
  total_amount: number
  currency: string
  payment_reference: string | null
  metadata: any | null
  created_at: string
  updated_at: string
  order_items: Array<{
    id: string
    order_id: string
    event_id: string
    ticket_type_id: string
    quantity: number
    unit_price: number
    subtotal_amount: number
    fee_amount: number
    total_amount: number
    currency: string
    created_at: string
    updated_at: string
  }>
  order_adjustments: any[]
  payments: any[]
} | null> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    const order = DEMO_ORDERS.find((o) => o.id === orderId)
    if (!order) return null

    return {
      ...order,
      order_items: DEMO_ORDER_ITEMS.filter((i) => i.order_id === orderId),
      order_adjustments: [],
      payments: [],
    }
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(*),
      order_adjustments(*),
      payments(*)
    `)
    .eq("id", orderId)
    .single()

  if (error) throw error
  return data
}

export async function getMyOrders(): Promise<
  Array<{
    id: string
    event_id: string
    purchaser_id: string
    purchaser_email: string
    purchaser_first_name?: string
    purchaser_last_name?: string
    status: string
    subtotal_amount: number
    fee_amount: number
    total_amount: number
    currency: string
    payment_reference: string | null
    metadata: any | null
    created_at: string
    updated_at: string
    order_items: Array<{
      id: string
      order_id: string
      event_id: string
      ticket_type_id: string
      quantity: number
      unit_price: number
      subtotal_amount: number
      fee_amount: number
      total_amount: number
      currency: string
      created_at: string
      updated_at: string
    }>
  }>
> {
  const demoSession = await getDemoSessionFromCookie()

  if (demoSession) {
    return DEMO_ORDERS.filter((o) => o.buyer_id === demoSession.id).map((order) => ({
      ...order,
      order_items: DEMO_ORDER_ITEMS.filter((i) => i.order_id === order.id),
    }))
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      order_items(*)
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data ?? []
}
