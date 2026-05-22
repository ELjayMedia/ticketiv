// Source: payment_routing_rules + payment_provider_settings +
// payment_attempts (for per-provider success-rate sparklines).

import "server-only"
import { createAdminClient } from "@/lib/supabase/admin"

export interface RoutingRule {
  id: string
  priority: number
  country_code: string | null
  currency: string | null
  provider: string
  fallback_provider: string | null
  is_active: boolean
  conditions: unknown
  notes: string | null
  updated_at: string
}

export interface ProviderRow {
  provider: string
  is_enabled: boolean
  mode: string | null
  callback_url: string | null
  success_rate_24h: number | null
  attempts_24h: number
}

export interface RoutingOverview {
  rules: RoutingRule[]
  providers: ProviderRow[]
  totalAttempts24h: number
  successful24h: number
}

export async function getRoutingOverview(): Promise<RoutingOverview> {
  const admin = createAdminClient()

  const [rulesRes, providersRes, attemptsRes] = await Promise.all([
    admin
      .from("payment_routing_rules")
      .select("id, priority, country_code, currency, provider, fallback_provider, is_active, conditions, notes, updated_at")
      .order("priority", { ascending: true }),
    admin
      .from("payment_provider_settings")
      .select("provider, is_enabled, mode, callback_url"),
    admin
      .from("payment_attempts")
      .select("provider, status")
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ])

  const attempts = attemptsRes.data ?? []
  const byProvider = new Map<string, { total: number; success: number }>()
  for (const a of attempts) {
    if (!a.provider) continue
    const slot = byProvider.get(a.provider) ?? { total: 0, success: 0 }
    slot.total += 1
    if (String(a.status).toLowerCase() === "succeeded") slot.success += 1
    byProvider.set(a.provider, slot)
  }

  const providers: ProviderRow[] = (providersRes.data ?? []).map((p) => {
    const stats = byProvider.get(p.provider) ?? { total: 0, success: 0 }
    return {
      provider: p.provider,
      is_enabled: p.is_enabled,
      mode: p.mode,
      callback_url: p.callback_url,
      success_rate_24h: stats.total > 0 ? Math.round((stats.success / stats.total) * 1000) / 10 : null,
      attempts_24h: stats.total,
    }
  })

  const totalAttempts24h = attempts.length
  const successful24h = attempts.filter((a) => String(a.status).toLowerCase() === "succeeded").length

  return {
    rules: (rulesRes.data ?? []) as RoutingRule[],
    providers,
    totalAttempts24h,
    successful24h,
  }
}
