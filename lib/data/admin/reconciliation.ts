import "server-only"

import {
  buildPayoutReconciliationBlock,
  buildEventReconciliation,
  type EventReconciliationResult,
  type PayoutReconciliationBlock,
  type ReconciliationLedgerEntry,
  type ReconciliationOrder,
  type ReconciliationOrderItem,
  type ReconciliationPayment,
  type ReconciliationPaymentAttempt,
  type ReconciliationStats,
  type ReconciliationStatus,
} from "@/lib/reconciliation"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export type FinanceReconciliationIssueStatus = "open" | "acknowledged" | "resolved" | "ignored"
export type FinanceReconciliationIssueSeverity = "warning" | "critical"

export interface FinanceReconciliationIssueRow {
  id: string
  detectorKey: string
  entityKey: string
  orgId: string | null
  orderId: string | null
  paymentId: string | null
  refundId: string | null
  severity: FinanceReconciliationIssueSeverity
  status: FinanceReconciliationIssueStatus
  title: string
  details: Record<string, unknown>
  runbookKey: string
  ownerUserId: string | null
  firstDetectedAt: string
  lastDetectedAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  resolutionNote: string | null
  ageSeconds: number
}

export interface FinanceReconciliationQueue {
  issues: FinanceReconciliationIssueRow[]
  totals: {
    active: number
    critical: number
    acknowledged: number
    resolved: number
    ignored: number
  }
}

type FinanceReconciliationQueueRecord = {
  id: string
  detector_key: string
  entity_key: string
  org_id: string | null
  order_id: string | null
  payment_id: string | null
  refund_id: string | null
  severity: FinanceReconciliationIssueSeverity
  status: FinanceReconciliationIssueStatus
  title: string
  details: unknown
  runbook_key: string
  owner_user_id: string | null
  first_detected_at: string
  last_detected_at: string
  acknowledged_at: string | null
  resolved_at: string | null
  resolution_note: string | null
  age_seconds: number | string | null
}

export interface PostEventReconciliationRow extends EventReconciliationResult {
  title: string
  orgId: string
  orgName: string
  currency: string
  eventStatus: string
  startsAt: string | null
  endsAt: string | null
  openPayoutCount: number
  openPayoutCents: number
}

export interface PostEventReconciliationOverview {
  generatedAt: string
  events: PostEventReconciliationRow[]
  totals: {
    events: number
    ready: number
    warning: number
    blocked: number
    openPayouts: number
    openPayoutCents: number
  }
}

type EventRow = {
  id: string
  org_id: string
  title: string
  status: string
  starts_at: string | null
  ends_at: string | null
  organizations?: { name?: string | null; default_currency?: string | null } | null
}

type TicketTypeRow = {
  id: string
  event_id: string
}

type OrderItemRow = {
  id: string
  order_id: string
  ticket_type_id: string
  status: string
  refunded_at: string | null
  revoked_at: string | null
}

type OrderRow = {
  id: string
  status: string
  total_cents: number
  subtotal_cents: number | null
  platform_fee_cents: number | null
  processor_fee_cents: number | null
  organizer_net_cents: number | null
  currency: string
}

type LedgerRow = {
  order_id: string | null
  type: string
  amount_cents: number
  currency: string
}

type PaymentRow = {
  id: string
  order_id: string
  status: string | null
  amount_cents: number
}

type PaymentAttemptRow = {
  id: string
  order_id: string | null
  status: string | null
  payment_id: string | null
}

type StatsRow = {
  event_id: string
  tickets_sold: number
  gross_sales_cents: number
  successful_payments: number
  failed_payments: number
  checked_in_count: number
  updated_at: string | null
}

type PayoutRow = {
  org_id: string
  amount_cents: number
  status: string
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export async function getFinanceReconciliationQueue(options?: {
  status?: FinanceReconciliationIssueStatus | "active" | "all"
  severity?: FinanceReconciliationIssueSeverity | "all"
}): Promise<FinanceReconciliationQueue> {
  const supabase = await createClient()
  const { data, error } = await (supabase.from as any)("v_finance_reconciliation_queue")
    .select(
      "id, detector_key, entity_key, org_id, order_id, payment_id, refund_id, severity, status, title, details, runbook_key, owner_user_id, first_detected_at, last_detected_at, acknowledged_at, resolved_at, resolution_note, age_seconds",
    )
    .order("severity", { ascending: true })
    .order("first_detected_at", { ascending: true })
    .limit(200)

  if (error) throw new Error(error.message)

  const allIssues = ((data ?? []) as FinanceReconciliationQueueRecord[]).map((row) => ({
    id: row.id,
    detectorKey: row.detector_key,
    entityKey: row.entity_key,
    orgId: row.org_id,
    orderId: row.order_id,
    paymentId: row.payment_id,
    refundId: row.refund_id,
    severity: row.severity,
    status: row.status,
    title: row.title,
    details: row.details && typeof row.details === "object" && !Array.isArray(row.details)
      ? row.details as Record<string, unknown>
      : {},
    runbookKey: row.runbook_key,
    ownerUserId: row.owner_user_id,
    firstDetectedAt: row.first_detected_at,
    lastDetectedAt: row.last_detected_at,
    acknowledgedAt: row.acknowledged_at,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    ageSeconds: Number(row.age_seconds ?? 0),
  }))

  const status = options?.status ?? "active"
  const severity = options?.severity ?? "all"
  const issues = allIssues.filter((issue) => {
    const statusMatches = status === "all"
      || (status === "active" && (issue.status === "open" || issue.status === "acknowledged"))
      || issue.status === status
    return statusMatches && (severity === "all" || issue.severity === severity)
  })

  return {
    issues,
    totals: {
      active: allIssues.filter((issue) => issue.status === "open" || issue.status === "acknowledged").length,
      critical: allIssues.filter(
        (issue) => issue.severity === "critical" && (issue.status === "open" || issue.status === "acknowledged"),
      ).length,
      acknowledged: allIssues.filter((issue) => issue.status === "acknowledged").length,
      resolved: allIssues.filter((issue) => issue.status === "resolved").length,
      ignored: allIssues.filter((issue) => issue.status === "ignored").length,
    },
  }
}

function statusTotals(events: PostEventReconciliationRow[]) {
  return events.reduce(
    (totals, event) => {
      totals.events += 1
      if (event.status === "ok") totals.ready += 1
      if (event.status === "warning") totals.warning += 1
      if (event.status === "danger") totals.blocked += 1
      return totals
    },
    { events: 0, ready: 0, warning: 0, blocked: 0 },
  )
}

function mapOrder(row: OrderRow): ReconciliationOrder {
  return {
    id: row.id,
    status: row.status,
    totalCents: row.total_cents ?? 0,
    subtotalCents: row.subtotal_cents ?? null,
    platformFeeCents: row.platform_fee_cents ?? null,
    processorFeeCents: row.processor_fee_cents ?? null,
    organizerNetCents: row.organizer_net_cents ?? null,
    currency: row.currency ?? "SZL",
  }
}

function mapOrderItem(row: OrderItemRow): ReconciliationOrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    refundedAt: row.refunded_at,
    revokedAt: row.revoked_at,
  }
}

function mapLedger(row: LedgerRow): ReconciliationLedgerEntry {
  return {
    orderId: row.order_id,
    type: row.type,
    amountCents: row.amount_cents ?? 0,
    currency: row.currency ?? "SZL",
  }
}

function mapPayment(row: PaymentRow): ReconciliationPayment {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    amountCents: row.amount_cents ?? 0,
  }
}

function mapAttempt(row: PaymentAttemptRow): ReconciliationPaymentAttempt {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status,
    paymentId: row.payment_id,
  }
}

function mapStats(row: StatsRow | undefined): ReconciliationStats | null {
  if (!row) return null
  return {
    ticketsSold: row.tickets_sold ?? 0,
    grossSalesCents: row.gross_sales_cents ?? 0,
    successfulPayments: row.successful_payments ?? 0,
    failedPayments: row.failed_payments ?? 0,
    checkedInCount: row.checked_in_count ?? 0,
    updatedAt: row.updated_at,
  }
}

function eventTone(status: ReconciliationStatus) {
  if (status === "danger") return 0
  if (status === "warning") return 1
  return 2
}

export async function getPostEventReconciliationOverview(options?: {
  limit?: number
}): Promise<PostEventReconciliationOverview> {
  const admin = createAdminClient()
  const generatedAt = new Date().toISOString()
  const limit = options?.limit ?? 80

  const { data: eventsData, error: eventsError } = await admin
    .from("events")
    .select("id, org_id, title, status, starts_at, ends_at, organizations(name, default_currency)")
    .lte("starts_at", generatedAt)
    .order("starts_at", { ascending: false })
    .limit(limit)

  if (eventsError) {
    console.error("[reconciliation] events:", eventsError)
    return {
      generatedAt,
      events: [],
      totals: { events: 0, ready: 0, warning: 0, blocked: 0, openPayouts: 0, openPayoutCents: 0 },
    }
  }

  const events = ((eventsData ?? []) as EventRow[]).filter((event) => {
    const endedAt = event.ends_at ?? event.starts_at
    return endedAt ? new Date(endedAt).getTime() <= Date.now() : false
  })
  const eventIds = events.map((event) => event.id)
  const orgIds = unique(events.map((event) => event.org_id))

  if (eventIds.length === 0) {
    return {
      generatedAt,
      events: [],
      totals: { events: 0, ready: 0, warning: 0, blocked: 0, openPayouts: 0, openPayoutCents: 0 },
    }
  }

  const [ticketTypesRes, statsRes, payoutsRes] = await Promise.all([
    admin.from("ticket_types").select("id, event_id").in("event_id", eventIds),
    admin
      .from("event_live_stats")
      .select("event_id, tickets_sold, gross_sales_cents, successful_payments, failed_payments, checked_in_count, updated_at")
      .in("event_id", eventIds),
    orgIds.length
      ? admin
          .from("payouts")
          .select("org_id, amount_cents, status")
          .in("org_id", orgIds)
          .in("status", ["requested", "processing"])
      : Promise.resolve({ data: [], error: null }),
  ])

  if (ticketTypesRes.error) console.error("[reconciliation] ticket_types:", ticketTypesRes.error)
  if (statsRes.error) console.error("[reconciliation] event_live_stats:", statsRes.error)
  if (payoutsRes.error) console.error("[reconciliation] payouts:", payoutsRes.error)

  const ticketTypes = (ticketTypesRes.data ?? []) as TicketTypeRow[]
  const ticketTypeToEvent = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType.event_id]))
  const ticketTypeIds = ticketTypes.map((ticketType) => ticketType.id)

  const orderItemsRes = ticketTypeIds.length
    ? await admin
        .from("order_items")
        .select("id, order_id, ticket_type_id, status, refunded_at, revoked_at")
        .in("ticket_type_id", ticketTypeIds)
        .limit(20000)
    : { data: [], error: null }

  if (orderItemsRes.error) console.error("[reconciliation] order_items:", orderItemsRes.error)

  const orderItems = (orderItemsRes.data ?? []) as OrderItemRow[]
  const orderIds = unique(orderItems.map((item) => item.order_id))

  const [ordersRes, ledgerRes, paymentsRes, attemptsRes] = await Promise.all([
    orderIds.length
      ? admin
          .from("orders")
          .select("id, status, total_cents, subtotal_cents, platform_fee_cents, processor_fee_cents, organizer_net_cents, currency")
          .in("id", orderIds)
          .limit(20000)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? admin
          .from("ledger_entries")
          .select("order_id, type, amount_cents, currency")
          .in("order_id", orderIds)
          .limit(30000)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? admin
          .from("payments")
          .select("id, order_id, status, amount_cents")
          .in("order_id", orderIds)
          .limit(20000)
      : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? admin
          .from("payment_attempts")
          .select("id, order_id, status, payment_id")
          .in("order_id", orderIds)
          .limit(20000)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (ordersRes.error) console.error("[reconciliation] orders:", ordersRes.error)
  if (ledgerRes.error) console.error("[reconciliation] ledger_entries:", ledgerRes.error)
  if (paymentsRes.error) console.error("[reconciliation] payments:", paymentsRes.error)
  if (attemptsRes.error) console.error("[reconciliation] payment_attempts:", attemptsRes.error)

  const orderMap = new Map(((ordersRes.data ?? []) as OrderRow[]).map((order) => [order.id, order]))
  const ledgerRows = (ledgerRes.data ?? []) as LedgerRow[]
  const paymentRows = (paymentsRes.data ?? []) as PaymentRow[]
  const attemptRows = (attemptsRes.data ?? []) as PaymentAttemptRow[]
  const statsMap = new Map(((statsRes.data ?? []) as StatsRow[]).map((stats) => [stats.event_id, stats]))

  const payoutSummaryByOrg = new Map<string, { count: number; cents: number }>()
  for (const payout of (payoutsRes.data ?? []) as PayoutRow[]) {
    const current = payoutSummaryByOrg.get(payout.org_id) ?? { count: 0, cents: 0 }
    current.count += 1
    current.cents += payout.amount_cents ?? 0
    payoutSummaryByOrg.set(payout.org_id, current)
  }

  const itemsByEvent = new Map<string, OrderItemRow[]>()
  for (const item of orderItems) {
    const eventId = ticketTypeToEvent.get(item.ticket_type_id)
    if (!eventId) continue
    const rows = itemsByEvent.get(eventId) ?? []
    rows.push(item)
    itemsByEvent.set(eventId, rows)
  }

  const rows = events.map((event) => {
    const eventItems = itemsByEvent.get(event.id) ?? []
    const eventOrderIds = new Set(eventItems.map((item) => item.order_id))
    const eventOrders = Array.from(eventOrderIds)
      .map((orderId) => orderMap.get(orderId))
      .filter((order): order is OrderRow => Boolean(order))
    const eventLedger = ledgerRows.filter((entry) => entry.order_id && eventOrderIds.has(entry.order_id))
    const eventPayments = paymentRows.filter((payment) => eventOrderIds.has(payment.order_id))
    const eventAttempts = attemptRows.filter((attempt) => attempt.order_id && eventOrderIds.has(attempt.order_id))
    const reconciliation = buildEventReconciliation({
      eventId: event.id,
      stats: mapStats(statsMap.get(event.id)),
      orders: eventOrders.map(mapOrder),
      orderItems: eventItems.map(mapOrderItem),
      ledgerEntries: eventLedger.map(mapLedger),
      payments: eventPayments.map(mapPayment),
      paymentAttempts: eventAttempts.map(mapAttempt),
    })
    const org = event.organizations
    const payoutSummary = payoutSummaryByOrg.get(event.org_id) ?? { count: 0, cents: 0 }

    return {
      ...reconciliation,
      title: event.title,
      orgId: event.org_id,
      orgName: org?.name ?? event.org_id.slice(0, 8),
      currency: org?.default_currency ?? "SZL",
      eventStatus: event.status,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      openPayoutCount: payoutSummary.count,
      openPayoutCents: payoutSummary.cents,
    }
  })

  rows.sort((a, b) => {
    const byStatus = eventTone(a.status) - eventTone(b.status)
    if (byStatus !== 0) return byStatus
    return new Date(b.endsAt ?? b.startsAt ?? 0).getTime() - new Date(a.endsAt ?? a.startsAt ?? 0).getTime()
  })

  const totalsByStatus = statusTotals(rows)
  const openPayouts = Array.from(payoutSummaryByOrg.values()).reduce((total, payout) => total + payout.count, 0)
  const openPayoutCents = Array.from(payoutSummaryByOrg.values()).reduce((total, payout) => total + payout.cents, 0)

  return {
    generatedAt,
    events: rows,
    totals: {
      ...totalsByStatus,
      openPayouts,
      openPayoutCents,
    },
  }
}

export async function getOrgPayoutReconciliationBlock(
  orgId: string,
  options?: { limit?: number },
): Promise<PayoutReconciliationBlock> {
  const overview = await getPostEventReconciliationOverview({ limit: options?.limit ?? 120 })

  return buildPayoutReconciliationBlock({
    events: overview.events,
    orgId,
    generatedAt: overview.generatedAt,
  })
}
