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
