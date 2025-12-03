import { redirect } from "next/navigation"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import { getOrdersForUser } from "@/lib/orders"
import DashboardClient from "./dashboard-client"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()

  if (!supabase) {
    // Redirect to login when Supabase is not configured
    redirect("/login")
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  const orders = await getOrdersForUser(session.user.id)

  return <DashboardClient orders={orders} />
}
