"use server"

import { revalidatePath } from "next/cache"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface ActionResult {
  ok: boolean
  error?: string
}

export async function setDefaultPaymentMethodAction(id: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const { error } = await supabase.rpc("fn_set_default_payment_method", { p_id: id })
  if (error) {
    console.error("[payment-methods] set default:", error)
    return { ok: false, error: "Could not update your default method." }
  }

  revalidatePath("/me/payment-methods")
  revalidatePath("/me")
  return { ok: true }
}

export async function removePaymentMethodAction(id: string): Promise<ActionResult> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return { ok: false, error: "Not available" }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Not signed in" }

  const { error } = await supabase.rpc("fn_deactivate_payment_method", { p_id: id })
  if (error) {
    console.error("[payment-methods] remove:", error)
    return { ok: false, error: "Could not remove that method." }
  }

  revalidatePath("/me/payment-methods")
  revalidatePath("/me")
  return { ok: true }
}
