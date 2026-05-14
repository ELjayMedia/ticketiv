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

export type AttentionItem = { kind: string; record_id: string; title: string; detail: string | null; created_at: string; href: string }
export type RecentOperation = { source: string; record_id: string; action: string; entity: string; entity_id: string | null; occurred_at: string }
export type CategoryUsage = { slug: string; name: string; is_active: boolean; total_events: number; published_events: number; draft_events: number }
export type CategoryActivity = { id: string; action: string; record_id: string | null; created_at: string; changes: Record<string, any> | null }

export async function getCommandCentreData() {
  const admin = createAdminClient()

  const [metricsResult, attentionResult, operationsResult, categoriesResult, categoryActivityResult] = await Promise.all([
    admin.from("admin_command_centre_metrics").select("*").single(),
    admin.from("admin_attention_queue").select("*").order("created_at", { ascending: false }).limit(8),
    admin.from("admin_recent_operations").select("*").order("occurred_at", { ascending: false }).limit(8),
    admin.from("event_categories").select("slug, name, is_active, sort_order").order("sort_order", { ascending: true }).order("name", { ascending: true }),
    admin.from("audit_log").select("id, action, record_id, created_at, changes").eq("table_name", "event_categories").order("created_at", { ascending: false }).limit(5),
  ])

  if (metricsResult.error) throw new Error(metricsResult.error.message)
  if (attentionResult.error) throw new Error(attentionResult.error.message)
  if (operationsResult.error) throw new Error(operationsResult.error.message)
  if (categoriesResult.error) throw new Error(categoriesResult.error.message)
  if (categoryActivityResult.error) throw new Error(categoryActivityResult.error.message)

  const categories = categoriesResult.data ?? []
  const categorySlugs = categories.map((category) => category.slug).filter(Boolean)
  const { data: eventsByCategory, error: categoryEventsError } = categorySlugs.length
    ? await admin.from("events").select("category, status").in("category", categorySlugs)
    : { data: [], error: null }

  if (categoryEventsError) throw new Error(categoryEventsError.message)

  const usageBySlug = new Map<string, { total_events: number; published_events: number; draft_events: number }>()
  for (const event of eventsByCategory ?? []) {
    const slug = String(event.category ?? "")
    const current = usageBySlug.get(slug) ?? { total_events: 0, published_events: 0, draft_events: 0 }
    current.total_events += 1
    if (event.status === "published") current.published_events += 1
    if (event.status === "draft") current.draft_events += 1
    usageBySlug.set(slug, current)
  }

  const categoryUsage: CategoryUsage[] = categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    is_active: category.is_active,
    ...(usageBySlug.get(category.slug) ?? { total_events: 0, published_events: 0, draft_events: 0 }),
  }))

  return {
    metrics: metricsResult.data as CommandCentreMetrics,
    attention: (attentionResult.data ?? []) as AttentionItem[],
    operations: (operationsResult.data ?? []) as RecentOperation[],
    categories: {
      total: categoryUsage.length,
      active: categoryUsage.filter((category) => category.is_active).length,
      unused: categoryUsage.filter((category) => category.total_events === 0).length,
      most_used: [...categoryUsage].sort((a, b) => b.total_events - a.total_events)[0] ?? null,
      usage: categoryUsage,
      recent_activity: (categoryActivityResult.data ?? []) as CategoryActivity[],
    },
  }
}

export function formatMoneyFromCents(amount: number | null | undefined, currency = "SZL") {
  const value = (amount ?? 0) / 100
  return new Intl.NumberFormat("en-SZ", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

export function formatNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-SZ").format(value ?? 0)
}

export function percentage(part: number, whole: number) {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}
