import "server-only"

import * as Sentry from "@sentry/nextjs"

import { deliverTicketsForOrder } from "@/lib/notifications/ticket-delivery"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Post-commit side effects for completed payments (TICK-333).
 *
 * fn_complete_order_payment writes the payment, ledger, tickets and order
 * status in one transaction, and records into payment_outbox the effects that
 * cannot be transactional -- today, sending the buyer their tickets. Those
 * entries are drained here, after the transaction has committed.
 *
 * The split matters in both directions: a mail provider timing out can never
 * roll back a payment that genuinely succeeded, and a payment that committed
 * can never quietly fail to send tickets, because the intent to send is stored
 * in the same commit as the money.
 */

export type OutboxTopic = "ticket_delivery"

interface OutboxEntry {
  id: string
  order_id: string
  payment_id: string | null
  topic: OutboxTopic
  payload: Record<string, unknown>
  attempts: number
}

export interface DrainResult {
  claimed: number
  succeeded: number
  failed: number
}

async function handleEntry(entry: OutboxEntry): Promise<void> {
  switch (entry.topic) {
    case "ticket_delivery": {
      const orderId = typeof entry.payload?.orderId === "string" ? entry.payload.orderId : entry.order_id
      await deliverTicketsForOrder(orderId)
      return
    }
    default: {
      // Exhaustive today. A topic added in SQL but not here must fail loudly
      // rather than be marked done without running.
      throw new Error(`No handler for outbox topic: ${entry.topic}`)
    }
  }
}

/**
 * Claim and process pending outbox entries.
 *
 * Claiming uses FOR UPDATE SKIP LOCKED inside fn_claim_payment_outbox, so the
 * request that just completed a payment and the retry sweeper can both run
 * without processing the same entry twice. Failures are recorded with an
 * exponential backoff and retried until the attempt ceiling, after which the
 * entry stays 'failed' for a human.
 *
 * Never throws: a completed payment must not be reported as failed because a
 * follow-up email did not send. Callers that need the detail read DrainResult.
 */
export async function drainPaymentOutbox(limit = 20): Promise<DrainResult> {
  const admin = createAdminClient()
  const result: DrainResult = { claimed: 0, succeeded: 0, failed: 0 }

  const { data, error } = await admin.rpc("fn_claim_payment_outbox", { p_limit: limit })
  if (error) {
    Sentry.captureException(error, { tags: { area: "payment-outbox", phase: "claim" } })
    return result
  }

  const entries = (data ?? []) as OutboxEntry[]
  result.claimed = entries.length

  for (const entry of entries) {
    try {
      await handleEntry(entry)
      await admin.rpc("fn_resolve_payment_outbox", { p_id: entry.id, p_ok: true })
      result.succeeded += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      Sentry.captureException(error, {
        tags: { area: "payment-outbox", topic: entry.topic },
        extra: { outboxId: entry.id, orderId: entry.order_id, attempts: entry.attempts },
      })
      await admin.rpc("fn_resolve_payment_outbox", { p_id: entry.id, p_ok: false, p_error: message })
      result.failed += 1
    }
  }

  return result
}
