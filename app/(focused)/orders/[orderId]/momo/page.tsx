import { notFound, redirect } from "next/navigation"

import { MomoPaymentClient } from "@/components/quiet/screens/checkout/momo-payment-client"
import { assertPaymentProviderAvailableForOrder } from "@/lib/payments/availability"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const metadata = { title: "Pay with MTN MoMo" }
export const dynamic = "force-dynamic"
export const fetchCache = "force-no-store"

export default async function MomoPaymentPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const supabase = await createServerSupabaseClient()
  if (!supabase) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${orderId}/momo`)}`)
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select("id, buyer_id, total_cents, currency, status")
    .eq("id", orderId)
    .maybeSingle()

  if (error) {
    console.error("[MoMo] Failed to load payment page order", error)
    notFound()
  }
  if (!order || order.buyer_id !== user.id) notFound()

  if (order.status === "paid") {
    redirect(`/orders/${order.id}/confirmation`)
  }
  if (order.status !== "pending") {
    redirect(`/orders/${order.id}/confirmation`)
  }

  try {
    await assertPaymentProviderAvailableForOrder(order.id, "momo")
  } catch {
    redirect(`/orders/${order.id}/confirmation?payment_method_unavailable=1`)
  }

  return (
    <MomoPaymentClient
      orderId={order.id}
      totalMinor={order.total_cents}
      currency={order.currency}
    />
  )
}
