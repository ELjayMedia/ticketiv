import { createServerSupabaseClient } from "@/lib/supabase-server"

export async function createOrder(data: {
  event_id: string
  purchaser_id: string
  purchaser_email: string
  ticket_selections: Array<{ ticket_type_id: string; quantity: number }>
  subtotal_amount: number
  fee_amount: number
  total_amount: number
  currency: string
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Not authenticated" }

  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        event_id: data.event_id,
        purchaser_id: data.purchaser_id,
        purchaser_email: data.purchaser_email,
        status: "pending",
        subtotal_amount: data.subtotal_amount,
        fee_amount: data.fee_amount,
        total_amount: data.total_amount,
        currency: data.currency,
      })
      .select()
      .single()

    if (orderError) throw orderError

    const orderItems = data.ticket_selections.map((selection) => ({
      order_id: order.id,
      event_id: data.event_id,
      ticket_type_id: selection.ticket_type_id,
      quantity: selection.quantity,
      unit_price: 0, // Should be fetched from ticket_type
      subtotal_amount: 0,
      fee_amount: 0,
      total_amount: 0,
      currency: data.currency,
    }))

    const { error: itemsError } = await supabase.from("order_items").insert(orderItems)

    if (itemsError) throw itemsError

    return { data: order, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function createPayment(data: {
  order_id: string
  user_id: string
  amount: number
  currency: string
  payment_method: string
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Not authenticated" }

  try {
    const { data: payment, error } = await supabase
      .from("payments")
      .insert({
        order_id: data.order_id,
        user_id: data.user_id,
        amount: data.amount,
        currency: data.currency,
        status: "pending",
        payment_method: data.payment_method,
      })
      .select()
      .single()

    if (error) throw error
    return { data: payment, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function checkInTicket(ticketCode: string, deviceId: string) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Not authenticated" }

  try {
    // Find ticket by QR code
    const { data: ticket, error: ticketError } = await supabase
      .from("order_items")
      .select("id, event_id, checked_in_at")
      .eq("qr_code", ticketCode)
      .single()

    if (ticketError) throw new Error("Ticket not found")

    if (ticket.checked_in_at) {
      return { error: "Ticket already checked in", status: "duplicate" }
    }

    // Update ticket with check-in
    const { error: updateError } = await supabase
      .from("order_items")
      .update({ checked_in_at: new Date().toISOString() })
      .eq("id", ticket.id)

    if (updateError) throw updateError

    // Log scan
    await supabase.from("scans").insert({
      ticket_id: ticket.id,
      event_id: ticket.event_id,
      device_id: deviceId,
      code: ticketCode,
      status: "valid",
      scanned_at: new Date().toISOString(),
    })

    return { data: { status: "valid" }, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}

export async function transferTicket(data: {
  ticket_id: string
  from_email: string
  to_email: string
}) {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { error: "Not authenticated" }

  try {
    const { data: transfer, error } = await supabase
      .from("transfers")
      .insert({
        ticket_id: data.ticket_id,
        from_email: data.from_email,
        to_email: data.to_email,
        status: "pending",
      })
      .select()
      .single()

    if (error) throw error
    return { data: transfer, error: null }
  } catch (error: any) {
    return { data: null, error: error.message }
  }
}
