import { beforeEach, describe, expect, it, vi } from "vitest"

// TICK-333 — the outbox drain is what turns "the payment committed" into
// "the buyer actually got their tickets". Its job is to be exactly-once in
// the happy case and never to let a delivery failure look like a payment
// failure, so both directions are asserted here.

const deliverTicketsForOrder = vi.fn()
const rpc = vi.fn()
const captureException = vi.fn()

vi.mock("@/lib/notifications/ticket-delivery", () => ({
  deliverTicketsForOrder: (...args: unknown[]) => deliverTicketsForOrder(...args),
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ rpc: (...args: unknown[]) => rpc(...args) }),
}))
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}))

// Static import is safe: vi.mock calls above are hoisted ahead of it.
import { drainPaymentOutbox } from "@/lib/payments/outbox"

function entry(overrides: Record<string, unknown> = {}) {
  return {
    id: "outbox_1",
    order_id: "order_1",
    payment_id: "pay_1",
    topic: "ticket_delivery",
    payload: { orderId: "order_1" },
    attempts: 1,
    ...overrides,
  }
}

/** Route fn_claim_payment_outbox to `claimed`; record resolve calls. */
function mockRpc(claimed: unknown[], claimError: unknown = null) {
  rpc.mockImplementation((fn: string) => {
    if (fn === "fn_claim_payment_outbox") return Promise.resolve({ data: claimed, error: claimError })
    return Promise.resolve({ data: null, error: null })
  })
}

function resolveCalls() {
  return rpc.mock.calls.filter(([fn]) => fn === "fn_resolve_payment_outbox").map(([, args]) => args)
}

beforeEach(() => {
  deliverTicketsForOrder.mockReset().mockResolvedValue(undefined)
  rpc.mockReset()
  captureException.mockReset()
})

describe("drainPaymentOutbox", () => {
  it("delivers tickets for a claimed entry and marks it done", async () => {
    mockRpc([entry()])

    const result = await drainPaymentOutbox()

    expect(deliverTicketsForOrder).toHaveBeenCalledWith("order_1")
    expect(result).toEqual({ claimed: 1, succeeded: 1, failed: 0 })
    expect(resolveCalls()).toEqual([{ p_id: "outbox_1", p_ok: true }])
  })

  it("records the failure and does not mark the entry done when delivery throws", async () => {
    mockRpc([entry()])
    deliverTicketsForOrder.mockRejectedValue(new Error("smtp unavailable"))

    const result = await drainPaymentOutbox()

    expect(result).toEqual({ claimed: 1, succeeded: 0, failed: 1 })
    expect(resolveCalls()).toEqual([
      { p_id: "outbox_1", p_ok: false, p_error: "smtp unavailable" },
    ])
    expect(captureException).toHaveBeenCalled()
  })

  // The caller has already committed a real payment by this point. Throwing
  // here would turn a successful purchase into a 500 and a provider retry.
  it("never throws when delivery fails", async () => {
    mockRpc([entry()])
    deliverTicketsForOrder.mockRejectedValue(new Error("boom"))

    await expect(drainPaymentOutbox()).resolves.toBeDefined()
  })

  it("never throws when the claim query itself fails", async () => {
    mockRpc([], { message: "connection reset" })

    const result = await drainPaymentOutbox()

    expect(result).toEqual({ claimed: 0, succeeded: 0, failed: 0 })
    expect(deliverTicketsForOrder).not.toHaveBeenCalled()
    expect(captureException).toHaveBeenCalled()
  })

  it("keeps processing the rest of the batch after one entry fails", async () => {
    mockRpc([entry({ id: "a", order_id: "o_a" }), entry({ id: "b", order_id: "o_b" })])
    deliverTicketsForOrder.mockRejectedValueOnce(new Error("first failed")).mockResolvedValue(undefined)

    const result = await drainPaymentOutbox()

    expect(result).toEqual({ claimed: 2, succeeded: 1, failed: 1 })
    expect(deliverTicketsForOrder).toHaveBeenCalledTimes(2)
    expect(resolveCalls()).toEqual([
      { p_id: "a", p_ok: false, p_error: "first failed" },
      { p_id: "b", p_ok: true },
    ])
  })

  it("fails an unknown topic loudly rather than marking it done unprocessed", async () => {
    mockRpc([entry({ topic: "some_future_topic" })])

    const result = await drainPaymentOutbox()

    expect(deliverTicketsForOrder).not.toHaveBeenCalled()
    expect(result.failed).toBe(1)
    expect(resolveCalls()[0]).toMatchObject({ p_ok: false })
    expect(String(resolveCalls()[0].p_error)).toContain("some_future_topic")
  })

  it("falls back to the row's order_id when the payload has no usable one", async () => {
    mockRpc([entry({ payload: {} })])

    await drainPaymentOutbox()

    expect(deliverTicketsForOrder).toHaveBeenCalledWith("order_1")
  })

  it("does nothing and reports an empty drain when there is no work", async () => {
    mockRpc([])

    const result = await drainPaymentOutbox()

    expect(result).toEqual({ claimed: 0, succeeded: 0, failed: 0 })
    expect(deliverTicketsForOrder).not.toHaveBeenCalled()
    expect(captureException).not.toHaveBeenCalled()
  })

  it("passes the batch limit through to the claim RPC", async () => {
    mockRpc([])

    await drainPaymentOutbox(5)

    expect(rpc).toHaveBeenCalledWith("fn_claim_payment_outbox", { p_limit: 5 })
  })
})
