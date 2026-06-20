"use server"

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Json } from "@/types/database"

export interface FeatureFlag {
  id: string
  key: string
  enabled: boolean
  config?: Json
  created_at: string | null
}

export interface PricingPlan {
  id: string
  active: boolean
  created_at: string
  currency: string
  effective_from: string
  max_platform_fee_cents: number | null
  min_platform_fee_cents: number | null
  org_id: string | null
  platform_fee_payer: string
  platform_fixed_cents: number
  platform_percent_bps: number
  processor_fee_payer: string
  processor_fixed_cents: number
  processor_percent_bps: number
}

/**
 * Get platform-level feature flags
 * Reads from: feature_flags
 */
export async function getPlatformFeatureFlags(): Promise<FeatureFlag[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .select("*")
      .is("org_id", null)
      .order("key")

    if (error) {
      console.error("[v0] Error fetching platform feature flags:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("[v0] Unexpected error fetching platform feature flags:", error)
    return []
  }
}

/**
 * Update platform feature flag
 * Writes to: feature_flags
 */
export async function updateFeatureFlag(
  flagId: string,
  enabled: boolean,
  config?: Record<string, unknown>
): Promise<FeatureFlag | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from("feature_flags")
      .update({ enabled, config: (config ?? null) as Json })
      .eq("id", flagId)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating feature flag:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[v0] Unexpected error updating feature flag:", error)
    return null
  }
}

/**
 * Get platform pricing plans
 * Reads from: pricing_plans
 */
export async function getPlatformPricingPlans(): Promise<PricingPlan[]> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("pricing_plans")
      .select("*")
      .is("org_id", null)
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
 * Create or update platform pricing plan
 * Writes to: pricing_plans
 */
export async function upsertPricingPlan(
  planData: Omit<PricingPlan, "created_at"> & { id?: string }
): Promise<PricingPlan | null> {
  const supabase = await createServerSupabaseClient()
  if (!supabase) return null

  try {
    if (planData.id) {
      const { data, error } = await supabase
        .from("pricing_plans")
        .update(planData as any)
        .eq("id", planData.id)
        .select()
        .single()

      if (error) {
        console.error("[v0] Error updating pricing plan:", error)
        return null
      }

      return data
    } else {
      const { data, error } = await supabase
        .from("pricing_plans")
        .insert({ ...(planData as any), org_id: null })
        .select()
        .single()

      if (error) {
        console.error("[v0] Error creating pricing plan:", error)
        return null
      }

      return data
    }
  } catch (error) {
    console.error("[v0] Unexpected error upserting pricing plan:", error)
    return null
  }
}
