export type ReconciliationStatus = "ok" | "warning" | "danger"

const SOLD_ITEM_STATUSES = new Set(["issued", "checked_in", "transferred"])
const STUCK_ATTEMPT_STATUSES = new Set(["pending", "processing"])

export interface ReconciliationOrder {
  id: string
  status: string
  totalCents: number
  subtotalCents: number | null
  platformFeeCents: number | null
  processorFeeCents: number | null
  organizerNetCents?: number | null
  currency: string
}

export interface ReconciliationOrderItem {
  id: string
  orderId: string
  status: string
  refundedAt: string | null
  revokedAt: string | null
}

export interface ReconciliationLedgerEntry {
  orderId: string | null
  type: string
  amountCents: number
  currency: string
}

export interface ReconciliationPayment {
  id: string
  orderId: string
  status: string | null
  amountCents: number
}

export interface ReconciliationPaymentAttempt {
  id: string
  orderId: string | null
  status: string | null
  paymentId: string | null
}

export interface ReconciliationStats {
  ticketsSold: number
  grossSalesCents: number
  successfulPayments: number
  failedPayments: number
  checkedInCount: number
  updatedAt: string | null
}

export interface EventReconciliationInput {
  eventId: string
  stats: ReconciliationStats | null
  orders: ReconciliationOrder[]
  orderItems: ReconciliationOrderItem[]
  ledgerEntries: ReconciliationLedgerEntry[]
  payments: ReconciliationPayment[]
  paymentAttempts: ReconciliationPaymentAttempt[]
}

export interface EventReconciliationCheck {
  key: "owner" | "ledger" | "tickets" | "payments" | "payout_review"
  label: string
  status: ReconciliationStatus
  detail: string
}

export interface EventReconciliationResult {
  eventId: string
  status: ReconciliationStatus
  paidOrderCount: number
  paidTicketCount: number
  expectedGrossCents: number
  expectedFeeCents: number
  expectedNetCents: number
  ledgerGrossCents: number
  ledgerFeeSignedCents: number
  ledgerNetCents: number
  succeededPaymentCents: number
  statsTicketsSold: number | null
  statsGrossSalesCents: number | null
  statsSuccessfulPayments: number | null
  statsFailedPayments: number | null
  statsCheckedInCount: number | null
  stuckPaymentAttemptCount: number
  orphanedPaymentAttemptCount: number
  checks: EventReconciliationCheck[]
}

export interface PayoutReconciliationBlockEvent {
  eventId: string
  title: string
  orgId: string
  orgName: string
  currency: string
  startsAt: string | null
  endsAt: string | null
  blockingChecks: EventReconciliationCheck[]
  expectedNetCents: number
  ledgerNetCents: number
  openPayoutCount: number
  openPayoutCents: number
}

export interface PayoutReconciliationBlock {
  orgId: string
  blocked: boolean
  generatedAt: string | null
  blockedEvents: PayoutReconciliationBlockEvent[]
}

export interface PayoutBlockableReconciliationEvent extends EventReconciliationResult {
  title: string
  orgId: string
  orgName: string
  currency: string
  startsAt: string | null
  endsAt: string | null
  openPayoutCount: number
  openPayoutCents: number
}

function sum<T>(rows: T[], getValue: (row: T) => number): number {
  return rows.reduce((total, row) => total + getValue(row), 0)
}

function worstStatus(checks: EventReconciliationCheck[]): ReconciliationStatus {
  if (checks.some((check) => check.status === "danger")) return "danger"
  if (checks.some((check) => check.status === "warning")) return "warning"
  return "ok"
}

function checkStatus(condition: boolean): ReconciliationStatus {
  return condition ? "ok" : "danger"
}

function feeTotal(order: ReconciliationOrder): number {
  return order.platformFeeCents ?? 0
}

function netTotal(order: ReconciliationOrder): number {
  return order.organizerNetCents ?? order.totalCents - feeTotal(order)
}

function grossTotal(order: ReconciliationOrder): number {
  // Gross collected == what the buyer paid (total), matching the settlement
  // ledger's order_gross row (buildLedgerEntries writes order_gross = total).
  // Using subtotal here silently mismatched whenever fees are buyer-paid
  // (total > subtotal), which is the live pricing config.
  return order.totalCents
}

function payoutBlockingChecks(event: PayoutBlockableReconciliationEvent): EventReconciliationCheck[] {
  const failedEvidenceChecks = event.checks.filter((check) => {
    return check.status === "danger" && check.key !== "owner" && check.key !== "payout_review"
  })

  if (failedEvidenceChecks.length > 0) return failedEvidenceChecks

  return event.checks.filter((check) => check.key === "payout_review" && check.status !== "ok")
}

export function buildPayoutReconciliationBlock({
  events,
  orgId,
  generatedAt = null,
}: {
  events: PayoutBlockableReconciliationEvent[]
  orgId: string
  generatedAt?: string | null
}): PayoutReconciliationBlock {
  const blockedEvents = events
    .filter((event) => event.orgId === orgId)
    .map((event) => ({ event, blockingChecks: payoutBlockingChecks(event) }))
    .filter(({ blockingChecks }) => blockingChecks.length > 0)
    .map(({ event, blockingChecks }) => ({
      eventId: event.eventId,
      title: event.title,
      orgId: event.orgId,
      orgName: event.orgName,
      currency: event.currency,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      blockingChecks,
      expectedNetCents: event.expectedNetCents,
      ledgerNetCents: event.ledgerNetCents,
      openPayoutCount: event.openPayoutCount,
      openPayoutCents: event.openPayoutCents,
    }))

  return {
    orgId,
    blocked: blockedEvents.length > 0,
    generatedAt,
    blockedEvents,
  }
}

export function buildEventReconciliation(input: EventReconciliationInput): EventReconciliationResult {
  const orderById = new Map(input.orders.map((order) => [order.id, order]))
  const paidOrders = input.orders.filter((order) => order.status === "paid")
  const paidOrderIds = new Set(paidOrders.map((order) => order.id))

  const paidTicketCount = input.orderItems.filter((item) => {
    return (
      paidOrderIds.has(item.orderId) &&
      SOLD_ITEM_STATUSES.has(item.status) &&
      !item.revokedAt &&
      !item.refundedAt
    )
  }).length

  const expectedGrossCents = sum(paidOrders, grossTotal)
  const expectedFeeCents = sum(paidOrders, feeTotal)
  const expectedNetCents = sum(paidOrders, netTotal)
  const ledgerRows = input.ledgerEntries.filter((entry) => entry.orderId && paidOrderIds.has(entry.orderId))

  const ledgerGrossCents = sum(
    ledgerRows.filter((entry) => entry.type === "order_gross"),
    (entry) => entry.amountCents,
  )
  const ledgerFeeSignedCents = sum(
    ledgerRows.filter((entry) => entry.type === "fee"),
    (entry) => entry.amountCents,
  )
  const ledgerNetCents = sum(
    ledgerRows.filter((entry) => entry.type === "payment_net"),
    (entry) => entry.amountCents,
  )

  const succeededPayments = input.payments.filter((payment) => {
    return paidOrderIds.has(payment.orderId) && payment.status === "succeeded"
  })
  const succeededPaymentCents = sum(succeededPayments, (payment) => payment.amountCents)

  const orphanedPaymentAttemptCount = input.paymentAttempts.filter((attempt) => {
    return !attempt.orderId || !orderById.has(attempt.orderId)
  }).length
  const stuckPaymentAttemptCount = input.paymentAttempts.filter((attempt) => {
    return Boolean(attempt.orderId && paidOrderIds.has(attempt.orderId) && STUCK_ATTEMPT_STATUSES.has(attempt.status ?? ""))
  }).length

  const ledgerMatches =
    ledgerGrossCents === expectedGrossCents &&
    ledgerFeeSignedCents === -expectedFeeCents &&
    ledgerNetCents === expectedNetCents

  const ticketsMatch = input.stats ? input.stats.ticketsSold === paidTicketCount : paidTicketCount === 0
  const ticketStatus: ReconciliationStatus = input.stats
    ? checkStatus(ticketsMatch)
    : paidTicketCount > 0
      ? "danger"
      : "warning"
  const paymentsMatch =
    succeededPaymentCents === sum(paidOrders, (order) => order.totalCents) &&
    stuckPaymentAttemptCount === 0 &&
    orphanedPaymentAttemptCount === 0

  const checks: EventReconciliationCheck[] = [
    {
      key: "owner",
      label: "Owner",
      status: "ok",
      detail: "Finance admin owns post-event reconciliation before payout release.",
    },
    {
      key: "ledger",
      label: "Ledger gross/fees/net",
      status: checkStatus(ledgerMatches),
      detail: ledgerMatches
        ? "Ledger entries match paid order gross, fees and net."
        : "Ledger gross, signed fees or net does not match paid orders.",
    },
    {
      key: "tickets",
      label: "Tickets sold",
      status: ticketStatus,
      detail: input.stats
        ? "event_live_stats tickets_sold matches paid issued tickets."
        : "event_live_stats is missing for this event.",
    },
    {
      key: "payments",
      label: "Payment attempts",
      status: checkStatus(paymentsMatch),
      detail: paymentsMatch
        ? "Succeeded payments match paid orders, with no stuck or orphaned attempts."
        : "Payment totals, stuck attempts or orphaned attempts need review.",
    },
    {
      key: "payout_review",
      label: "Payout review",
      status: ledgerMatches && ticketStatus === "ok" && paymentsMatch ? "ok" : "danger",
      detail: ledgerMatches && ticketStatus === "ok" && paymentsMatch
        ? "Ready for payout review."
        : "Resolve reconciliation discrepancies before payout release.",
    },
  ]

  return {
    eventId: input.eventId,
    status: worstStatus(checks),
    paidOrderCount: paidOrders.length,
    paidTicketCount,
    expectedGrossCents,
    expectedFeeCents,
    expectedNetCents,
    ledgerGrossCents,
    ledgerFeeSignedCents,
    ledgerNetCents,
    succeededPaymentCents,
    statsTicketsSold: input.stats?.ticketsSold ?? null,
    statsGrossSalesCents: input.stats?.grossSalesCents ?? null,
    statsSuccessfulPayments: input.stats?.successfulPayments ?? null,
    statsFailedPayments: input.stats?.failedPayments ?? null,
    statsCheckedInCount: input.stats?.checkedInCount ?? null,
    stuckPaymentAttemptCount,
    orphanedPaymentAttemptCount,
    checks,
  }
}
