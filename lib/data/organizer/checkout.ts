import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { OrderRecord, OrderItemRecord } from "@/types"

export async function createOrder(input: {
  event_id: string
  purchaser_id: string
  purchaser_email: string
  purchaser_first_name?: string
  purchaser_last_name?: string
  channel?: string
  items: Array<{
    ticket_type_id: string
    quantity: number
  }>
  promo_code?: string
  device_id?: string
  nonce?: string
}): Promise<{
  order: OrderRecord
  items: OrderItemRecord[]
  pricing_breakdown: {
    subtotal_cents: number
    fee_cents: number
    discount_cents: number
    total_cents: number
    currency: string
  }
}> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  // Validate ticket availability and get prices
  const { data: ticketTypes, error: ttError } = await supabase
    .from("ticket_types")
    .select("*")
    .in(
      "id",
      input.items.map((i) => i.ticket_type_id),
    )

  if (ttError) throw ttError

  // Calculate pricing
  let subtotalCents = 0
  for (const item of input.items) {
    const tt = ticketTypes?.find((t) => t.id === item.ticket_type_id)
    if (!tt) throw new Error(`Ticket type ${item.ticket_type_id} not found`)
    subtotalCents += tt.price_cents * item.quantity
  }

  const feeCents = Math.floor(subtotalCents * 0.05) // TODO: Get from pricing_plans
  const discountCents = 0 // TODO: Apply promo code
  const totalCents = subtotalCents + feeCents - discountCents

  // Create order
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_id: input.purchaser_id,
      buyer_email: input.purchaser_email,
      org_id: "", // caller should supply org_id; placeholder until createOrder is refactored
      status: "pending",
      subtotal_cents: subtotalCents,
      platform_fee_cents: feeCents,
      total_cents: totalCents,
      currency: "USD",
      channel: (input.channel as any) || "online",
      device_id: input.device_id ?? null,
    })
    .select()
    .single()

  if (orderError || !order) throw orderError

  // Create order items
  const itemsToInsert = input.items.flatMap((item) => {
    const tt = ticketTypes?.find((t) => t.id === item.ticket_type_id)!
    return Array.from({ length: item.quantity }, (_, i) => ({
      order_id: order.id,
      ticket_type_id: item.ticket_type_id,
      ticket_code: `TKT-${order.id.slice(0, 8)}-${i}`,
      status: "issued" as const,
    }))
  })

  const { data: items, error: itemsError } = await supabase.from("order_items").insert(itemsToInsert).select()

  if (itemsError || !items) throw itemsError

  return {
    order,
    items,
    pricing_breakdown: {
      subtotal_cents: subtotalCents,
      fee_cents: feeCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      currency: "USD",
    },
  }
}

export async function applyPromoCode(
  orderDraft: {
    event_id: string
    items: Array<{ ticket_type_id: string; quantity: number }>
    subtotal_cents: number
  },
  code: string,
): Promise<{
  is_valid: boolean
  discount_cents: number
  type: "percentage" | "fixed" | "free"
  message?: string
}> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return { is_valid: false, discount_cents: 0, type: "fixed", message: "Service unavailable" }
  const { data: priceRule, error } = await supabase
    .from("price_rules")
    .select("*")
    .eq("code", code.toUpperCase())
    .single()

  if (error || !priceRule) {
    return {
      is_valid: false,
      discount_cents: 0,
      type: "fixed",
      message: "Invalid promo code",
    }
  }

  // Validate time window
  const now = new Date()
  if (priceRule.starts_at && new Date(priceRule.starts_at) > now) {
    return {
      is_valid: false,
      discount_cents: 0,
      type: "fixed",
      message: "Promo code not yet active",
    }
  }
  if (priceRule.ends_at && new Date(priceRule.ends_at) < now) {
    return {
      is_valid: false,
      discount_cents: 0,
      type: "fixed",
      message: "Promo code expired",
    }
  }

  // Calculate discount
  let discountCents = 0
  if (priceRule.type === "percentage") {
    discountCents = Math.floor(orderDraft.subtotal_cents * (priceRule.value / 100))
  } else if (priceRule.type === "fixed") {
    discountCents = priceRule.value
  }

  return {
    is_valid: true,
    discount_cents: discountCents,
    type: priceRule.type,
    message: `${code.toUpperCase()} applied!`,
  }
}

export async function createPayment(
  orderId: string,
  provider: "deltapay" | "paystack" | "flutterwave",
): Promise<{
  payment_id: string
  provider_reference: string
  checkout_url: string
  amount_cents: number
  currency: string
}> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  // Get order details
  const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single()

  if (orderError || !order) throw orderError

  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      order_id: orderId,
      provider,
      amount: order.total_amount,
      currency: order.currency,
      status: "initiated",
    })
    .select()
    .single()

  if (paymentError || !payment) throw paymentError

  // TODO: Call actual payment provider API
  return {
    payment_id: payment.id,
    provider_reference: `ref-${payment.id}`,
    checkout_url: `/checkout/success?order_id=${orderId}`,
    amount_cents: order.total_amount,
    currency: order.currency,
  }
}

export async function verifyPayment(reference: string): Promise<{
  status: "succeeded" | "failed" | "pending"
  order_id: string
  amount_cents: number
  currency: string
}> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { data: payment, error } = await supabase
    .from("payments")
    .select("*, order:orders(*)")
    .eq("provider_reference", reference)
    .single()

  if (error || !payment) throw error

  // TODO: Verify with actual payment provider

  return {
    status: payment.status,
    order_id: payment.order_id,
    amount_cents: payment.amount,
    currency: payment.currency,
  }
}

export async function previewOrder(input: {
  eventId: string
  items: Array<{ ticket_type_id: string; quantity: number }>
  channel?: string
  promoCode?: string
}) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  // Get ticket types with pricing
  const { data: ticketTypes, error: ttError } = await supabase
    .from("ticket_types")
    .select("*")
    .in(
      "id",
      input.items.map((i) => i.ticket_type_id),
    )

  if (ttError) throw ttError

  let subtotalCents = 0
  const lineItems = []

  for (const item of input.items) {
    const tt = ticketTypes?.find((t) => t.id === item.ticket_type_id)
    if (!tt) throw new Error(`Ticket type ${item.ticket_type_id} not found`)

    const itemTotal = tt.price_cents * item.quantity
    subtotalCents += itemTotal

    lineItems.push({
      ticket_type_id: item.ticket_type_id,
      ticket_type_name: tt.name,
      quantity: item.quantity,
      unit_price_cents: tt.price_cents,
      subtotal_cents: itemTotal,
    })
  }

  // Get pricing plan for fees
  const { data: pricingPlan } = await supabase.from("pricing_plans").select("*").eq("event_id", input.eventId).single()

  const feeBps = (pricingPlan as { platform_percent_bps?: number } | null)?.platform_percent_bps ?? 500
  const feeCents = Math.floor(subtotalCents * feeBps / 10000)

  // Apply promo code if provided
  let discountCents = 0
  if (input.promoCode) {
    const promoResult = await validatePromoCode({
      eventId: input.eventId,
      code: input.promoCode,
      channel: input.channel,
      items: input.items,
    })
    if (promoResult.is_valid) {
      discountCents = promoResult.discount_cents
    }
  }

  const totalCents = subtotalCents + feeCents - discountCents

  return {
    subtotal_cents: subtotalCents,
    fee_cents: feeCents,
    discount_cents: discountCents,
    total_cents: totalCents,
    currency: "USD",
    line_items: lineItems,
    adjustments: [
      { type: "platform_fee", amount_cents: feeCents, label: "Platform Fee" },
      ...(discountCents > 0 ? [{ type: "promo_discount", amount_cents: -discountCents, label: "Promo Discount" }] : []),
    ],
  }
}

export async function validatePromoCode(input: {
  eventId: string
  orgId?: string
  code: string
  channel?: string
  items: Array<{ ticket_type_id: string; quantity: number }>
}) {
  const supabase = await createServerSupabaseClient()
  if (!supabase) throw new Error("Supabase not configured")

  const { data: priceRule, error } = await supabase
    .from("price_rules")
    .select("*")
    .eq("code", input.code.toUpperCase())
    .single()

  if (error || !priceRule) {
    return {
      is_valid: false,
      discount_cents: 0,
      type: "percentage" as const,
      value: 0,
      message: "Invalid promo code",
    }
  }

  // Validate time window
  const now = new Date()
  if (priceRule.starts_at && new Date(priceRule.starts_at) > now) {
    return {
      is_valid: false,
      discount_cents: 0,
      type: priceRule.type,
      value: 0,
      message: "Promo code not yet active",
    }
  }
  if (priceRule.ends_at && new Date(priceRule.ends_at) < now) {
    return {
      is_valid: false,
      discount_cents: 0,
      type: priceRule.type,
      value: 0,
      message: "Promo code expired",
    }
  }

  return {
    is_valid: true,
    discount_cents: 0, // Caller should calculate based on type/value
    type: priceRule.type,
    value: priceRule.value,
    message: `${input.code.toUpperCase()} applied!`,
  }
}
