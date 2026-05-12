import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export type CommandCentreMetrics = {
  total_organizations: number
  total_events: number
  published_events: number
  draft_events: number
  upcoming_events: number
  ticket_types: number
  total_orders: number
  paid_orders: number
  gross_revenue_cents: number
  platform_fee_cents: number
  failed_payments: number
  failed_payment_attempts: number
  pending_payouts: number
  pending_payout_cents: number
  open_refunds: number
  open_refund_cents: number
  tickets_issued: number
  tickets_checked_in: number
  scans_last_24h: number
  unprocessed_webhooks: number
  failed_jobs: number
}

export type AttentionItem = {
  kind: string
  record_id: string
  title: string
  detail: string | null
  created_at: string
  href: string
}

export type RecentOperation = {
  source: string
  record_id: string
  action: string
  entity: string
  entity_id: string | null
  occurred_at: string
}

export async function getCommandCentreData() {
  const admin = createAdminClient()

  const [metricsResult, attentionResult, operationsResult] = await Promise.all([
    admin.from("admin_command_centre_metrics").select("*").single(),
    admin.from("admin_attention_queue").select("*").order("created_at", { ascending: false }).limit(8),
    admin.from("admin_recent_operations").select("*").order("occurred_at", { ascending: false }).limit(8),
  ])

  if (metricsResult.error) throw new Error(metricsResult.error.message)
  if (attentionResult.error) throw new Error(attentionResult.error.message)
  if (operationsResult.error) throw new Error(operationsResult.error.message)

  return {
    metrics: metricsResult.data as CommandCentreMetrics,
    attention: (attentionResult.data ?? []) as AttentionItem[],
    operations: (operationsResult.data ?? []) as RecentOperation[],
  }
}

export function formatMoneyFromCents(amount: number | null | undefined, currency = "SZL") {
  const value = (amount ?? 0) / 100
  return new Intl.NumberFormat("en-SZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-SZ").format(value ?? 0)
}

export function percentage(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}
