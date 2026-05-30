"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface Refund {
  id: string
  payment_id: string
  initiated_by: string | null
  status: "requested" | "processing" | "processed" | "failed"
  type: "full" | "partial"
  amount_cents: number
  currency: string
  processed_at: string | null
  created_at: string | null
}

export interface RefundItem {
  id: string
  refund_id: string
  order_item_id: string | null
  amount_cents: number
  currency: string
  reason: string | null
  created_at: string
}

export async function getUserRefunds(userId: string): Promise<Refund[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("refunds")
      .select("id, payment_id, initiated_by, status, type, amount_cents, currency, processed_at, created_at")
      .eq("initiated_by", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[refunds] getUserRefunds:", error)
      return []
    }

    return (data ?? []) as Refund[]
  } catch (error) {
    console.error("[refunds] getUserRefunds unexpected:", error)
    return []
  }
}

export async function getRefundDetail(refundId: string): Promise<(Refund & { items: RefundItem[] }) | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data: refund, error: refundError } = await supabase
      .from("refunds")
      .select("id, payment_id, initiated_by, status, type, amount_cents, currency, processed_at, created_at")
      .eq("id", refundId)
      .maybeSingle()

    if (refundError || !refund) {
      console.error("[refunds] getRefundDetail:", refundError)
      return null
    }

    const { data: items } = await supabase
      .from("refund_items")
      .select("id, refund_id, order_item_id, amount_cents, currency, reason, created_at")
      .eq("refund_id", refundId)

    return {
      ...(refund as Refund),
      items: (items ?? []) as RefundItem[],
    }
  } catch (error) {
    console.error("[refunds] getRefundDetail unexpected:", error)
    return null
  }
}

export async function requestRefund(
  orderItemId: string,
  reason: string,
  amountCents: number
): Promise<{ success: boolean; error?: string }> {
  // Refund mutations must go through the API route for payment gateway integration
  const res = await fetch("/api/tickets/refund", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderItemId, reason, amountCents }),
  })
  if (!res.ok) return { success: false, error: await res.text() }
  return { success: true }
}
