import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ResaleCheckoutPaymentStatus {
  paymentId: string
  orderId: string
  status: string
  provider: string
  amountCents: number
  currency: string
  isSucceeded: boolean
}

export async function getResaleCheckoutPaymentStatus(paymentId: string | null): Promise<ResaleCheckoutPaymentStatus | null> {
  if (!paymentId) return null

  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from("payments")
    .select("id, order_id, provider, amount_cents, currency, status, payload")
    .eq("id", paymentId)
    .maybeSingle()

  if (error) {
    console.error("[resale-checkout] payment status:", error)
    return null
  }

  if (!data || (data.payload as { kind?: string } | null)?.kind !== "resale_checkout") return null

  return {
    paymentId: data.id,
    orderId: data.order_id,
    status: data.status ?? "pending",
    provider: data.provider ?? "manual",
    amountCents: data.amount_cents ?? 0,
    currency: data.currency ?? "SZL",
    isSucceeded: data.status === "succeeded",
  }
}
