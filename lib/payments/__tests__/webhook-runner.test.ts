import { beforeEach, describe, expect, it, vi } from "vitest"

type Row = { id: string; provider: string; provider_event_id: string; processed_at: string | null }

const state = vi.hoisted(() => ({
  rows: [] as Row[],
  failInsert: false,
  captured: [] as unknown[],
}))

vi.mock("@sentry/nextjs", () => ({ captureException: (error: unknown) => state.captured.push(error) }))

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table !== "webhooks") throw new Error(`unexpected table ${table}`)
      const filters: Record<string, string> = {}
      let pendingUpdate: Partial<Row> | null = null
      let pendingInsert: Row | null = null
      const builder: any = {
        select: () => builder,
        eq(column: string, value: string) {
          filters[column] = value
          if (pendingUpdate && column === "id") {
            const row = state.rows.find((r) => r.id === value)
            if (row) Object.assign(row, pendingUpdate)
            return Promise.resolve({ error: null })
          }
          return builder
        },
        maybeSingle: () =>
          Promise.resolve({
            data: state.rows.find((r) => r.provider === filters.provider && r.provider_event_id === filters.provider_event_id) ?? null,
            error: null,
          }),
        insert(values: Omit<Row, "id" | "processed_at">) {
          pendingInsert = { ...values, id: `w${state.rows.length + 1}`, processed_at: null } as Row
          return builder
        },
        single: () => {
          if (pendingInsert) {
            if (state.failInsert) return Promise.resolve({ data: null, error: { code: "XX000" } })
            state.rows.push(pendingInsert)
            return Promise.resolve({ data: { id: pendingInsert.id }, error: null })
          }
          return builder.maybeSingle()
        },
        update(values: Partial<Row>) {
          pendingUpdate = values
          return builder
        },
      }
      return builder
    },
  }),
}))

import { runPaymentWebhook } from "@/lib/payments/webhooks/run"
import type { PaymentWebhookAdapter } from "@/lib/payments/webhooks/types"

function adapter(overrides: Partial<PaymentWebhookAdapter> = {}): PaymentWebhookAdapter {
  return {
    provider: "paystack",
    recordsReceipt: true,
    intake: async () => ({ eventId: "evt_1", signature: "sig", payload: { a: 1 } }),
    process: async () => ({ done: true, response: Response.json({ ok: true, settled: true }) }),
    failureBody: () => ({ error: "boom" }),
    ...overrides,
  }
}

const post = () => new Request("https://ticketiv.app/api/integrations/payments/paystack/webhook", { method: "POST", body: "{}" })

beforeEach(() => {
  state.rows = []
  state.failInsert = false
  state.captured = []
})

describe("runPaymentWebhook", () => {
  it("records a receipt, settles, and marks it processed", async () => {
    const res = await runPaymentWebhook(adapter(), post())
    expect(await res.json()).toEqual({ ok: true, settled: true })
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0].processed_at).not.toBeNull()
  })

  it("answers a redelivery of a processed event as a duplicate without settling again", async () => {
    const process = vi.fn(async () => ({ done: true, response: Response.json({ ok: true }) }))
    await runPaymentWebhook(adapter({ process }), post())
    const res = await runPaymentWebhook(adapter({ process }), post())
    expect(await res.json()).toEqual({ ok: true, duplicate: true })
    expect(process).toHaveBeenCalledTimes(1)
  })

  it("keeps a pending event open so a later delivery reuses the same row", async () => {
    const pending = adapter({ process: async () => ({ done: false, response: Response.json({ ok: true, pending: true }, { status: 202 }) }) })
    expect((await runPaymentWebhook(pending, post())).status).toBe(202)
    expect((await runPaymentWebhook(pending, post())).status).toBe(202)
    expect(state.rows).toHaveLength(1)
    expect(state.rows[0].processed_at).toBeNull()
  })

  it("answers 500 and reports when processing throws, leaving the receipt open", async () => {
    const res = await runPaymentWebhook(adapter({ process: async () => { throw new Error("db down") } }), post())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "boom" })
    expect(state.captured).toHaveLength(1)
    expect(state.rows[0].processed_at).toBeNull()
  })

  it("stops at intake without touching receipts", async () => {
    const res = await runPaymentWebhook(adapter({ intake: async () => Response.json({ error: "Invalid signature" }, { status: 401 }) }), post())
    expect(res.status).toBe(401)
    expect(state.rows).toHaveLength(0)
  })

  it("answers 500 when the receipt cannot be recorded", async () => {
    state.failInsert = true
    const process = vi.fn()
    const res = await runPaymentWebhook(adapter({ process }), post())
    expect(res.status).toBe(500)
    expect(process).not.toHaveBeenCalled()
  })

  it("skips receipts for adapters that keep their own record", async () => {
    const res = await runPaymentWebhook(adapter({ recordsReceipt: false }), post())
    expect(res.status).toBe(200)
    expect(state.rows).toHaveLength(0)
  })
})
