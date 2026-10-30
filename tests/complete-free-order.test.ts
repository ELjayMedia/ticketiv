import { beforeEach, describe, expect, it, vi } from "vitest"

// completeFreeOrder has no provider to verify against, so the order itself is
// the guard: owned by the buyer, pending, and exactly zero.
const mocks = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  rpc: vi.fn(),
  drain: vi.fn(),
  eqCalls: [] as Array<[string, unknown]>,
}))

vi.mock("server-only", () => ({}))
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }))
vi.mock("@/lib/payments/outbox", () => ({ drainPaymentOutbox: mocks.drain }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => {
      const query: any = {
        select: () => query,
        eq: (col: string, val: unknown) => {
          mocks.eqCalls.push([col, val])
          return query
        },
        maybeSingle: async () => ({ data: mocks.order, error: null }),
      }
      return query
    },
    rpc: (...args: unknown[]) => ({ maybeSingle: () => mocks.rpc(...args) }),
  }),
}))

import { completeFreeOrder } from "@/lib/payments"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.eqCalls = []
  mocks.rpc.mockResolvedValue({ data: { completed_order_id: "order-1", issued_item_count: 2 }, error: null })
})

describe("completeFreeOrder", () => {
  it("settles a pending zero-total order through the atomic completion RPC", async () => {
    mocks.order = { id: "order-1", status: "pending", total_cents: 0, currency: "SZL" }

    await expect(completeFreeOrder("order-1", "buyer-1")).resolves.toEqual({ orderId: "order-1", issuedItemCount: 2 })

    expect(mocks.eqCalls).toContainEqual(["buyer_id", "buyer-1"])
    expect(mocks.rpc).toHaveBeenCalledWith("fn_complete_order_payment", {
      p_order_id: "order-1",
      p_provider: "free",
      p_ext_payment_id: "free:order-1",
      p_amount_cents: 0,
      p_currency: "SZL",
      p_payload: { source: "free_registration" },
    })
    expect(mocks.drain).toHaveBeenCalled()
  })

  it("refuses an order that costs money", async () => {
    mocks.order = { id: "order-1", status: "pending", total_cents: 15000, currency: "SZL" }
    await expect(completeFreeOrder("order-1", "buyer-1")).rejects.toThrow("Order is not free")
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("refuses orders that are not pending or not the buyer's", async () => {
    mocks.order = { id: "order-1", status: "failed", total_cents: 0, currency: "SZL" }
    await expect(completeFreeOrder("order-1", "buyer-1")).rejects.toThrow(/not payable/)
    mocks.order = null
    await expect(completeFreeOrder("order-1", "someone-else")).rejects.toThrow("Order not found")
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
