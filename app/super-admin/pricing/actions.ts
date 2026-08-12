"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminRole } from "@/lib/super-admin/auth"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CURRENCY_RE = /^[A-Z]{3}$/

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

export async function createPricingPlanVersionAction(formData: FormData) {
  const { user } = await requireAdminRole(["super_admin"])
  const orgId = requiredString(formData, "org_id")
  const currency = requiredString(formData, "currency").toUpperCase()
  const platformPercentBps = percentToBps(requiredString(formData, "platform_percent"), "Commission")
  const processorPercentBps = percentToBps(requiredString(formData, "processor_percent"), "Processor percentage")
  const processorFixedCents = moneyToCents(requiredString(formData, "processor_fixed"), "Processor fixed fee")
  const minPlatformFeeCents = moneyToCents(requiredString(formData, "min_platform_fee"), "Minimum platform fee")

  if (!UUID_RE.test(orgId)) throw new Error("Invalid organization id")
  if (!CURRENCY_RE.test(currency)) throw new Error("Currency must be a three-letter ISO code")

  const admin = createAdminClient()
  const { data, error } = await (admin as any).rpc("admin_create_pricing_plan_version", {
    p_org_id: orgId,
    p_platform_percent_bps: platformPercentBps,
    p_processor_percent_bps: processorPercentBps,
    p_processor_fixed_cents: processorFixedCents,
    p_min_platform_fee_cents: minPlatformFeeCents,
    p_currency: currency,
    p_actor_id: user.id,
  })

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Pricing plan version was not created")

  revalidatePath("/super-admin")
  revalidatePath("/super-admin/pricing")
  revalidatePath("/super-admin/audit")

  const risk = platformPercentBps <= processorPercentBps ? "margin_risk" : "ok"
  redirect(`/super-admin/pricing?status=pricing_updated&risk=${risk}&org=${encodeURIComponent(orgId)}`)
}
