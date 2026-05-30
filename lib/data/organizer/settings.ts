"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"

export interface PricingPlan {
  id: string
  active: boolean
  created_at: string
  currency: string
  effective_from: string
  max_platform_fee_cents: number | null
  min_platform_fee_cents: number | null
  org_id: string
  platform_fee_payer: string
  platform_fixed_cents: number
  platform_percent_bps: number
  processor_fee_payer: string
  processor_fixed_cents: number
  processor_percent_bps: number
}

export interface FeatureFlag {
  id: string
  org_id: string
  key: string
  enabled: boolean
  config?: Record<string, unknown>
  created_at: string
}

export interface Webhook {
  id: string
  org_id: string
  url: string
  event_types: string[]
  is_active: boolean
  created_at: string
}

/**
 * Get pricing plans for org
 * Reads from: pricing_plans
 */
export async function getOrgPricingPlans(orgId: string): Promise<PricingPlan[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("pricing_plans")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching pricing plans:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching pricing plans:", error)
    return []
  }
}

/**
 * Get feature flags for org
 * Reads from: feature_flags
 */
export async function getOrgFeatureFlags(orgId: string): Promise<FeatureFlag[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .eq("org_id", orgId)

    if (error) {
      console.error("[v0] Error fetching feature flags:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching feature flags:", error)
    return []
  }
}

/**
 * Get webhooks for org
 * Reads from: webhooks
 */
export async function getOrgWebhooks(orgId: string): Promise<Webhook[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("webhooks")
      .select("*")
      .eq("org_id", orgId)

    if (error) {
      console.error("[v0] Error fetching webhooks:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching webhooks:", error)
    return []
  }
}
