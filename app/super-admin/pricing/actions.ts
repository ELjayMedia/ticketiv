"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim()
  if (!value) throw new Error(`${key} is required`)
  return value
}

function percentToBps(value: string, label: string) {
  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`${label} must be a percentage with at most two decimal places`)
  }

  const [whole, fraction = ""] = value.split(".")
  const bps = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  if (!Number.isInteger(bps) || bps < 0 || bps > 10000) {
    throw new Error(`${label} must be between 0% and 100%`)
  }
  return bps
}

function moneyToCents(value: string, label: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) {
    throw new Error(`${label} must be a non-negative amount with at most two decimal places`)
  }

  const [whole, fraction = ""] = value.split(".")
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"))
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`${label} is outside the supported range`)
  }
  return cents
}

/**
 * Set Ticketiv's platform-wide fee (percent of each ticket + fixed amount per
 * ticket). Applies to orders placed from now on; existing orders keep the
 * rate they were placed with. The database function versions the setting
 * and writes the audit entry atomically.
 */
export async function setPlatformFeeAction(formData: FormData) {
  const { user } = await requireAdminRole(["super_admin"])
  const percentBps = percentToBps(requiredString(formData, "percent"), "Percentage")
  const fixedPerTicketCents = moneyToCents(requiredString(formData, "fixed_per_ticket"), "Fixed fee per ticket")

  const admin = createAdminClient()
  const { data, error } = await (admin as any).rpc("admin_set_platform_fee", {
    p_percent_bps: percentBps,
    p_fixed_per_ticket_cents: fixedPerTicketCents,
    p_actor_id: user.id,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Platform fee was not saved")

  revalidatePath("/super-admin")
  revalidatePath("/super-admin/pricing")
  revalidatePath("/super-admin/audit")

  redirect("/super-admin/pricing?status=fee_updated")
}
