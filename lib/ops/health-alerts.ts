export type AlertSeverity = "info" | "warning" | "critical"
export type AlertStatus = "ok" | "alert" | "skipped"

export interface OpsAlertCheck {
  key: string
  status: AlertStatus
  severity: AlertSeverity
  title: string
  message: string
  details: Record<string, unknown>
}

export interface PaymentAttemptSignal {
  status: string | null
  provider?: string | null
}

export interface WebhookSignal {
  provider?: string | null
  provider_event_id?: string | null
  received_at: string | null
}

export interface PaymentSuccessThresholds {
  minAttempts: number
  minSuccessRate: number
}

export interface HealthUrlResult {
  url: string
  ok: boolean
  status?: number
  durationMs: number
  error?: string
}

/**
 * Anomaly counts from public.fn_ops_reconciliation_counts() (0 = healthy).
 * Mirrors scripts/ops-reconciliation.sql plus payout / async-work signals.
 */
export interface ReconciliationCounts {
  succeeded_payment_order_not_paid?: number
  paid_order_no_settlement_ledger?: number
  settlement_ledger_invariant_broken?: number
  paid_order_items_pending?: number
  duplicate_succeeded_payments?: number
  processed_refund_no_ledger?: number
  pending_order_with_succeeded_payment?: number
  issued_ticket_on_unpaid_order?: number
  creation_time_ledger_pollution?: number
  payout_overdraw_orgs?: number
  failed_payouts?: number
  stuck_payment_outbox?: number
  stuck_notifications?: number
  deadletter_jobs?: number
}

function count(value: number | undefined | null): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function nonZero(entries: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(entries).filter(([, v]) => v > 0))
}

const FAILED_ATTEMPT_STATUSES = new Set(["failed", "timed_out", "cancelled"])

export function evaluatePaymentSuccessRate(
  attempts: PaymentAttemptSignal[],
  thresholds: PaymentSuccessThresholds
): OpsAlertCheck {
  const totalAttempts = attempts.length
  const succeeded = attempts.filter((attempt) => attempt.status === "succeeded").length
  const failed = attempts.filter((attempt) => FAILED_ATTEMPT_STATUSES.has(String(attempt.status))).length
  const pending = attempts.filter((attempt) => attempt.status === "pending").length
  const successRate = totalAttempts > 0 ? succeeded / totalAttempts : null

  if (totalAttempts < thresholds.minAttempts) {
    return {
      key: "payment-success-rate",
      status: "skipped",
      severity: "info",
      title: "Payment success rate skipped",
      message: `Only ${totalAttempts} payment attempt(s) in the window; minimum sample is ${thresholds.minAttempts}.`,
      details: { totalAttempts, succeeded, failed, pending, successRate, thresholds },
    }
  }

  const isHealthy = successRate !== null && successRate >= thresholds.minSuccessRate

  return {
    key: "payment-success-rate",
    status: isHealthy ? "ok" : "alert",
    severity: isHealthy ? "info" : "critical",
    title: isHealthy ? "Payment success rate healthy" : "Payment success rate below threshold",
    message: `${succeeded}/${totalAttempts} recent payment attempt(s) succeeded.`,
    details: { totalAttempts, succeeded, failed, pending, successRate, thresholds },
  }
}

export function evaluateWebhookLag(
  staleWebhooks: WebhookSignal[],
  lagMinutes: number
): OpsAlertCheck {
  const oldest = staleWebhooks
    .map((webhook) => webhook.received_at)
    .filter(Boolean)
    .sort()[0] ?? null

  const isHealthy = staleWebhooks.length === 0

  return {
    key: "webhook-processing-lag",
    status: isHealthy ? "ok" : "alert",
    severity: isHealthy ? "info" : "critical",
    title: isHealthy ? "Webhook processing healthy" : "Webhook processing lag detected",
    message: isHealthy
      ? `No unprocessed webhooks older than ${lagMinutes} minute(s).`
      : `${staleWebhooks.length} unprocessed webhook(s) are older than ${lagMinutes} minute(s).`,
    details: {
      staleCount: staleWebhooks.length,
      lagMinutes,
      oldestReceivedAt: oldest,
      providers: uniqueStrings(staleWebhooks.map((webhook) => webhook.provider)),
    },
  }
}

export function evaluateHealthUrls(results: HealthUrlResult[]): OpsAlertCheck {
  const failed = results.filter((result) => !result.ok)
  const isHealthy = failed.length === 0

  return {
    key: "health-url-checks",
    status: isHealthy ? "ok" : "alert",
    severity: isHealthy ? "info" : "critical",
    title: isHealthy ? "Health URLs reachable" : "Health URL failure detected",
    message: isHealthy
      ? `${results.length} configured health URL(s) responded successfully.`
      : `${failed.length}/${results.length} configured health URL(s) failed.`,
    details: {
      checked: results.length,
      failed: failed.map((result) => ({
        url: result.url,
        status: result.status ?? null,
        error: result.error ?? null,
        durationMs: result.durationMs,
      })),
    },
  }
}

/**
 * Money / order-state integrity. Any non-zero category is a correctness break
 * (money moved without a ledger, tickets issued on an unpaid order, etc.), so
 * this is critical when it fires. Mirrors ops-reconciliation.sql #1-#6, #9-#11.
 */
export function evaluateOrderStateConsistency(counts: ReconciliationCounts): OpsAlertCheck {
  const categories = {
    succeeded_payment_order_not_paid: count(counts.succeeded_payment_order_not_paid),
    paid_order_no_settlement_ledger: count(counts.paid_order_no_settlement_ledger),
    settlement_ledger_invariant_broken: count(counts.settlement_ledger_invariant_broken),
    paid_order_items_pending: count(counts.paid_order_items_pending),
    duplicate_succeeded_payments: count(counts.duplicate_succeeded_payments),
    processed_refund_no_ledger: count(counts.processed_refund_no_ledger),
    pending_order_with_succeeded_payment: count(counts.pending_order_with_succeeded_payment),
    issued_ticket_on_unpaid_order: count(counts.issued_ticket_on_unpaid_order),
    creation_time_ledger_pollution: count(counts.creation_time_ledger_pollution),
  }
  const total = Object.values(categories).reduce((sum, n) => sum + n, 0)
  const isHealthy = total === 0

  return {
    key: "order-state-consistency",
    status: isHealthy ? "ok" : "alert",
    severity: isHealthy ? "info" : "critical",
    title: isHealthy ? "Order/ledger integrity healthy" : "Order/ledger integrity anomalies detected",
    message: isHealthy
      ? "No order/payment/ledger inconsistencies detected."
      : `${total} order/payment/ledger inconsistency row(s) across ${Object.keys(nonZero(categories)).length} category(ies).`,
    details: { total, categories: nonZero(categories) },
  }
}

/**
 * Payout integrity: an org drawing down more than its settled-net-minus-refunds
 * (over-draw) is critical; failed payouts awaiting attention are a warning.
 * Mirrors ops-reconciliation.sql #7 plus payouts.status = 'failed'.
 */
export function evaluatePayoutIntegrity(counts: ReconciliationCounts): OpsAlertCheck {
  const overdraw = count(counts.payout_overdraw_orgs)
  const failed = count(counts.failed_payouts)

  if (overdraw > 0) {
    return {
      key: "payout-integrity",
      status: "alert",
      severity: "critical",
      title: "Payout over-draw detected",
      message: `${overdraw} org(s) have committed payouts exceeding their settled net minus refunds.`,
      details: { overdrawOrgs: overdraw, failedPayouts: failed },
    }
  }
  if (failed > 0) {
    return {
      key: "payout-integrity",
      status: "alert",
      severity: "warning",
      title: "Failed payouts awaiting attention",
      message: `${failed} payout(s) are in a failed state.`,
      details: { overdrawOrgs: 0, failedPayouts: failed },
    }
  }
  return {
    key: "payout-integrity",
    status: "ok",
    severity: "info",
    title: "Payout integrity healthy",
    message: "No payout over-draw and no failed payouts.",
    details: { overdrawOrgs: 0, failedPayouts: 0 },
  }
}

/**
 * Stuck async work: an overdue payment_outbox row means a paid order may not be
 * finalizing (critical); stuck notifications and dead-lettered jobs are warnings.
 */
export function evaluateStuckAsyncWork(counts: ReconciliationCounts): OpsAlertCheck {
  const outbox = count(counts.stuck_payment_outbox)
  const notifications = count(counts.stuck_notifications)
  const jobs = count(counts.deadletter_jobs)
  const total = outbox + notifications + jobs
  const details = { stuckPaymentOutbox: outbox, stuckNotifications: notifications, deadletterJobs: jobs }

  if (total === 0) {
    return {
      key: "stuck-async-work",
      status: "ok",
      severity: "info",
      title: "Async work healthy",
      message: "No stuck payment-outbox rows, notifications, or dead-lettered jobs.",
      details,
    }
  }
  return {
    key: "stuck-async-work",
    status: "alert",
    severity: outbox > 0 ? "critical" : "warning",
    title: outbox > 0 ? "Payment outbox processing stuck" : "Stuck async work detected",
    message:
      `${outbox} overdue payment-outbox, ${notifications} stuck notification(s), ` +
      `${jobs} dead-lettered job(s).`,
    details,
  }
}

/**
 * Provider-settlement counts from public.fn_provider_settlement_counts().
 * `hoursSinceLastIngest` is -1 when nothing has ever been ingested.
 */
export interface SettlementCounts {
  settlement_items_unmatched?: number
  settlement_amount_mismatch?: number
  settlement_internal_imbalance?: number
  succeeded_payments_never_settled?: number
  hours_since_last_settlement_ingest?: number
}

/**
 * Compares what the provider says it settled against what we recorded. Any
 * mismatch here is a real-money difference (a fee we did not model, a
 * transaction reversed provider-side, money that never arrived), so it is
 * critical. Staleness is only a warning: it means we have stopped *looking*,
 * not that money is known-wrong.
 */
export function evaluateProviderSettlement(
  counts: SettlementCounts,
  staleAfterHours = 48,
): OpsAlertCheck {
  const categories = {
    settlement_items_unmatched: count(counts.settlement_items_unmatched),
    settlement_amount_mismatch: count(counts.settlement_amount_mismatch),
    settlement_internal_imbalance: count(counts.settlement_internal_imbalance),
    succeeded_payments_never_settled: count(counts.succeeded_payments_never_settled),
  }
  const total = Object.values(categories).reduce((sum, n) => sum + n, 0)
  const hours = Number(counts.hours_since_last_settlement_ingest ?? -1)
  const neverIngested = hours < 0
  const stale = !neverIngested && hours >= staleAfterHours
  const details = { total, categories: nonZero(categories), hoursSinceLastIngest: hours }

  if (total > 0) {
    return {
      key: "provider-settlement",
      status: "alert",
      severity: "critical",
      title: "Provider settlement mismatch",
      message: `${total} settlement discrepancy row(s) between the provider and our records.`,
      details,
    }
  }
  if (neverIngested) {
    // Before the first ingest there is nothing to compare; say so rather than
    // implying the books reconcile against the provider.
    return {
      key: "provider-settlement",
      status: "skipped",
      severity: "info",
      title: "Provider settlement not yet ingested",
      message: "No settlement data ingested yet — provider comparison is not running.",
      details,
    }
  }
  if (stale) {
    return {
      key: "provider-settlement",
      status: "alert",
      severity: "warning",
      title: "Provider settlement data is stale",
      message: `Last settlement ingest was ${hours}h ago (threshold ${staleAfterHours}h).`,
      details,
    }
  }
  return {
    key: "provider-settlement",
    status: "ok",
    severity: "info",
    title: "Provider settlement reconciled",
    message: "Provider settlement matches our payments, and ingest is current.",
    details,
  }
}

export function hasAlert(checks: OpsAlertCheck[]) {
  return checks.some((check) => check.status === "alert")
}

export function buildOpsAlertPayload(checks: OpsAlertCheck[], sourceUrl: string) {
  const alerts = checks.filter((check) => check.status === "alert")

  return {
    source: "ticketiv",
    sourceUrl,
    severity: alerts.some((check) => check.severity === "critical") ? "critical" : "warning",
    title: alerts.length === 1 ? alerts[0].title : `${alerts.length} Ticketiv operational alerts`,
    timestamp: new Date().toISOString(),
    alerts: alerts.map((check) => ({
      key: check.key,
      severity: check.severity,
      title: check.title,
      message: check.message,
      details: check.details,
    })),
  }
}

export async function postOpsAlert(webhookUrl: string | undefined, payload: unknown) {
  if (!webhookUrl) {
    return { sent: false, skipped: true, status: null as number | null }
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })

  return { sent: response.ok, skipped: false, status: response.status }
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))]
}
