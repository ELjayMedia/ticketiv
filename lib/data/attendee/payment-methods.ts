// Source: payment_methods, RLS-scoped to the current user. Never selects the
// provider token — that column must not reach the browser.

import "server-only"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface SavedPaymentMethod {
  id: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
  methodType: string
  provider: string
  isDefault: boolean
}

export async function listMyPaymentMethods(): Promise<SavedPaymentMethod[] | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("payment_methods")
    .select("id, brand, last4, exp_month, exp_year, method_type, provider, is_default")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })

  return (data ?? []).map((m) => ({
    id: m.id,
    brand: m.brand,
    last4: m.last4,
    expMonth: m.exp_month,
    expYear: m.exp_year,
    methodType: m.method_type,
    provider: m.provider,
    isDefault: m.is_default,
  }))
}
