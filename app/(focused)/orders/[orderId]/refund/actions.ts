"use server"

import crypto from "crypto"
import { revalidatePath } from "next/cache"

import { getOrderForBuyer } from "@/lib/data/attendee/orders"
import { refundQuoteForHoursBefore, resolveRefundPolicy } from "@/lib/refund-policy"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface BuyerRefundRequestInput {
  orderId: string
  ticketIds: string[]
  reason: string
  notes?: string
}

function requestKey(userId: string, orderId: string, ticketIds: string[]) {
  return crypto
    .createHash("sha256")
    .update([userId, orderId, ...[...ticketIds].sort()].join(":"))
    .digest("hex")
}

export async function requestBuyerRefundAction(input: BuyerRefundRequestInput) {
  const supabase = createServerSupabaseClient()
  if (!supabase) throw new Error("Not authenticated")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const orderId = String(input.orderId ?? "").trim()
  const reason = String(input.reason ?? "").trim()
  const notes = String(input.notes ?? "").trim().slice(0, 1000)
  const ticketIds = [...new Set((input.ticketIds ?? []).map((id) => String(id).trim()).filter(Boolean))]

  if (!orderId) throw new Error("Order is required")
  if (!reason) throw new Error("Refund reason is required")
  if (ticketIds.length === 0) throw new Error("Select at least one ticket")

  // This lookup is RLS-scoped through v_my_tickets. It proves both that the
  // order belongs to this buyer and that every submitted ticket is still in
  // the buyer's current ticket wallet (not transferred away).
  const order = await getOrderForBuyer(orderId)
  if (!order || order.status !== "paid") throw new Error("Only paid orders can be refunded")

  const available = new Map(
    order.items.filter((item) => item.id).map((item) => [item.id as string, item]),
  )
  const selected = ticketIds.map((id) => available.get(id)).filter(Boolean)
  if (selected.length !== ticketIds.length) {
    throw new Error("One or more selected tickets are no longer refundable")
  }

  const eventId = order.event_id
  if (!eventId) throw new Error("Event not found for this order")

  const admin = createAdminClient()
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, org_id, starts_at, refund_policy")
    .eq("id", eventId)
    .maybeSingle()
  if (eventError) throw new Error(`Unable to load refund policy: ${eventError.message}`)
  if (!event?.starts_at) throw new Error("Event start time is not configured")

  const hoursBefore = (new Date(event.starts_at).getTime() - Date.now()) / (60 * 60 * 1000)
  const policy = resolveRefundPolicy(event.refund_policy)
  const quote = refundQuoteForHoursBefore(policy, hoursBefore)
  if (!quote || quote.refundBps <= 0) {
    throw new Error("This order is outside the event's refundable window")
  }

  const itemAmounts = selected.map((item) => ({
    order_item_id: item!.id as string,
    amount_cents: Math.max(0, Math.round((item!.price_cents ?? 0) * quote.refundBps / 10000)),
    currency: order.currency,
  }))
  const amountCents = itemAmounts.reduce((sum, item) => sum + item.amount_cents, 0)
  if (amountCents <= 0) throw new Error("The selected tickets have no refundable value")

  const { data: payment, error: paymentError } = await admin
    .from("payments")
    .select("id, provider, amount_cents, currency, ext_payment_id, status")
    .eq("order_id", orderId)
    .eq("provider", "paystack")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (paymentError) throw new Error(`Unable to load payment: ${paymentError.message}`)
  if (!payment?.ext_payment_id) throw new Error("No refundable Paystack payment was found")
  if (payment.currency.toUpperCase() !== order.currency.toUpperCase()) {
    throw new Error("Order and payment currencies do not match")
  }

  const dedupeKey = requestKey(user.id, orderId, ticketIds)
  const { data: existing, error: existingError } = await admin
    .from("refunds")
    .select("id, status, provider_payload")
    .eq("payment_id", payment.id)
    .in("status", ["requested", "processing", "processed"])
    .order("created_at", { ascending: false })
  if (existingError) throw new Error(`Unable to check existing refunds: ${existingError.message}`)

  const duplicate = (existing ?? []).find((refund) => {
    const payload = refund.provider_payload
    return Boolean(
      payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        (payload as Record<string, unknown>).request_key === dedupeKey,
    )
  })
  if (duplicate) {
    return { ok: true, refundId: duplicate.id, status: duplicate.status, amountCents, duplicate: true }
  }

  const alreadyRefunding = (existing ?? []).reduce((sum, refund) => {
    const match = refund as any
    return sum + Math.max(0, Number(match.amount_cents ?? 0))
  }, 0)
  // Existing select intentionally keeps the payload/status small; calculate the
  // authoritative aggregate separately so concurrent/partial refunds cannot
  // exceed the original succeeded payment.
  const { data: activeAmounts, error: amountError } = await admin
    .from("refunds")
    .select("amount_cents")
    .eq("payment_id", payment.id)
    .in("status", ["requested", "processing", "processed"])
  if (amountError) throw new Error(`Unable to validate refundable balance: ${amountError.message}`)
  const reservedRefunds = (activeAmounts ?? []).reduce(
    (sum, refund) => sum + Math.max(0, refund.amount_cents ?? 0),
    0,
  )
  void alreadyRefunding
  if (reservedRefunds + amountCents > payment.amount_cents) {
    throw new Error("This refund would exceed the remaining refundable payment balance")
  }

  const { data: refund, error: insertError } = await admin
    .from("refunds")
    .insert({
      payment_id: payment.id,
      amount_cents: amountCents,
      currency: payment.currency,
      type: amountCents === payment.amount_cents ? "full" : "partial",
      status: "requested",
      initiated_by: user.id,
      provider_payload: {
        source: "buyer",
        request_key: dedupeKey,
        reason,
        notes: notes || null,
        order_id: orderId,
        event_id: eventId,
        policy_kind: policy.kind,
        policy_label: policy.label,
        refund_bps: quote.refundBps,
        hours_before: Math.max(0, hoursBefore),
        items: itemAmounts,
      },
    })
    .select("id, status")
    .single()
  if (insertError || !refund) {
    throw new Error(insertError?.message ?? "Unable to request refund")
  }

  const { error: auditError } = await admin.from("audit_log").insert({
    org_id: event.org_id,
    actor_id: user.id,
    table_name: "refunds",
    record_id: refund.id,
    action: "other",
    changes: {
      event_type: "buyer_refund_requested",
      refund_id: refund.id,
      order_id: orderId,
      event_id: eventId,
      ticket_ids: ticketIds,
      amount_cents: amountCents,
      currency: payment.currency,
      reason,
      refund_bps: quote.refundBps,
    },
  })
  if (auditError) throw new Error(`Refund requested but audit logging failed: ${auditError.message}`)

  revalidatePath(`/orders/${orderId}/refund`)
  revalidatePath("/tickets")
  return { ok: true, refundId: refund.id, status: refund.status, amountCents, duplicate: false }
}
