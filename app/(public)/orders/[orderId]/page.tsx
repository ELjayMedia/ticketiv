import { redirect } from "next/navigation"

import { OrderDetailClient } from "./order-detail-client"
import { createServerSupabaseClient } from "@/lib/supabase-server"

interface OrderPageProps {
  params: Promise<{ orderId: string }>
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params
  const supabase = createServerSupabaseClient()

  if (!supabase) redirect("/sign-in")

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect(`/sign-in?redirectTo=${encodeURIComponent(`/orders/${orderId}`)}`)
  }

  return <OrderDetailClient orderId={orderId} />
}
