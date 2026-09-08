import { describe, expect, it } from "vitest"

import {
  isPaystackRefundEvent,
  mapPaystackRefundEventStatus,
  mapPaystackRefundStatus,
  paystackRefundProviderReference,
  paystackRefundTransactionReference,
  paystackRefundWebhookEventId,
} from "@/lib/payments/paystack-refund-core"
import {
  migrationCronJob,
  migrationFunction,
  migrationFunctionGrants,
} from "../../../tests/helpers/migration-contract"

function readRefundCronMigrations() {
  return migrationFunction("public.fn_refund_reconciliation_tick")
}

describe("Paystack refund lifecycle helpers", () => {
  it.each([
    ["refund.pending", "processing"],
    ["refund.processing", "processing"],
    ["refund.needs-attention", "processing"],
    ["refund.processed", "processed"],
    ["refund.failed", "failed"],
  ] as const)("maps %s to %s", (event, expected) => {
    expect(isPaystackRefundEvent(event)).toBe(true)
    expect(mapPaystackRefundEventStatus(event)).toBe(expected)
  })

  it.each([
    ["pending", "processing"],
    ["processing", "processing"],
    ["needs-attention", "processing"],
    ["processed", "processed"],
    ["failed", "failed"],
  ] as const)("maps provider status %s to %s", (status, expected) => {
    expect(mapPaystackRefundStatus(status)).toBe(expected)
  })

  it("does not treat transaction events as refunds", () => {
    expect(isPaystackRefundEvent("charge.success")).toBe(false)
    expect(mapPaystackRefundEventStatus("charge.success")).toBeNull()
    expect(mapPaystackRefundStatus("success")).toBeNull()
  })

  it("extracts transaction and refund references from common Paystack shapes", () => {
    expect(
      paystackRefundTransactionReference({
        transaction_reference: "paystack_order_attempt",
      }),
    ).toBe("paystack_order_attempt")

    expect(
      paystackRefundTransactionReference({
        transaction: { reference: "nested-reference" },
      }),
    ).toBe("nested-reference")

    expect(paystackRefundProviderReference({ id: 91 })).toBe("91")
  })

  it("keeps lifecycle webhook audit ids distinct for the same refund", () => {
    const base = { data: { id: 91, transaction_reference: "paystack_order_attempt" } }
    expect(paystackRefundWebhookEventId({ ...base, event: "refund.pending" })).toBe("refund.pending:91")
    expect(paystackRefundWebhookEventId({ ...base, event: "refund.processed" })).toBe("refund.processed:91")
  })
})

describe("Paystack refund reconciliation scheduling", () => {
  it("preserves the prior HTTP outcome before queuing another run", () => {
    const migrations = readRefundCronMigrations()

    expect(migrations).toContain("r.job = 'refund-reconciliation'")
    expect(migrations).toContain("from net._http_response resp")
    expect(migrations).toContain("resolved_at = now()")
    expect(migrations).toContain("'resolved_previous', v_resolved")
    expect(migrations).toContain("requested_at < now() - interval '30 days'")
  })

  it("keeps the scheduler service-only and on the canonical origin", () => {
    expect(readRefundCronMigrations()).toContain("https://ticketiv.app/api/cron/refunds")

    const job = migrationCronJob("ticketiv-refund-reconciliation")

    expect(job, "the refund-reconciliation cron job is not scheduled by any migration").toBeDefined()
    expect(job!.schedule).toBe("*/15 * * * *")
    expect(job!.command).toBe("select public.fn_refund_reconciliation_tick();")

    const grants = migrationFunctionGrants("public.fn_refund_reconciliation_tick")

    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(grants.grantees).toEqual(["service_role"])
  })
})
