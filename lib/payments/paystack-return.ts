import "server-only"

import { completeVerifiedPayment } from "@/lib/payments"
import { verifyPaystackTransaction } from "@/lib/payments/paystack-config"
import { assertPaystackReturnMatches } from "@/lib/payments/paystack-return-core"
import { createAdminClient } from "@/lib/supabase/admin"

interface ReturnOrder {
  id: string
  buyer_id: string
  total_cents: number
  currency: string
  status: "pending" | "paid" | "failed" | "refunded"
}

export async function reconcileVerifiedPaystackReturn(input: {
  orderId: string
  reference: string
  userId: string
}) {
  const reference = input.reference.trim()
  if (!/^[A-Za-z0-9_.=-]{1,200}$/.test(reference)) {
    throw new Error("Invalid Paystack return reference")
  }

  const admin = createAdminClient()
  const [{ data: order, error: orderError }, { data: attempt, error: attemptError }] =
    await Promise.all([
      admin
        .from("orders")
        .select("id, buyer_id, total_cents, currency, status")
        .eq("id", input.orderId)
        .eq("buyer_id", input.userId)
        .maybeSingle<ReturnOrder>(),
      admin
        .from("payment_attempts")
        .select("id, status, ext_ref")
        .eq("order_id", input.orderId)
        .eq("provider", "paystack")
        .eq("ext_ref", reference)
        .maybeSingle(),
    ])

  if (orderError || !order) throw new Error("Paystack return order not found")
  if (attemptError || !attempt) throw new Error("Paystack return attempt not found")
  if (order.status === "paid") return { completed: true, duplicate: true }
  if (order.status !== "pending") throw new Error(`Order is not payable from status: ${order.status}`)

  const verified = await verifyPaystackTransaction(reference)
  assertPaystackReturnMatches(
    {
      reference,
      amountCents: order.total_cents,
      currency: order.currency,
    },
    verified,
  )

  const result = await completeVerifiedPayment({
    orderId: order.id,
    provider: "paystack",
    extPaymentId: reference,
    payload: {
      source: "verified_paystack_return",
      status: verified.status,
      reference: verified.reference,
      amount: verified.amountCents,
      currency: verified.currency,
    },
  })

  return { completed: true, duplicate: result.alreadyCompleted, ...result }
}
