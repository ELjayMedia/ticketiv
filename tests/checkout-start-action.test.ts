import { beforeEach, describe, expect, it, vi } from "vitest"

// startCheckoutAction: free registrations skip payment providers entirely;
// paid orders carry the buyer's name and the promo *code* (not its id).
const mocks = vi.hoisted(() => ({
  ensureCheckoutIdentity: vi.fn(),
  createOrder: vi.fn(),
  completeFreeOrder: vi.fn(),
  createPaymentAttempt: vi.fn(),
  getEffectivePaymentProvidersForEvent: vi.fn(),
  assertPaymentProviderAvailableForEvent: vi.fn(),
  assertEventTransactionsOpen: vi.fn(),
  ticketTypePrices: [] as Array<{ id: string; price_cents: number }>,
  orderTotal: 0,
  rpc: vi.fn(),
}))

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock("@/lib/auth/checkout-identity", () => ({ ensureCheckoutIdentity: mocks.ensureCheckoutIdentity }))
vi.mock("@/lib/orders", () => ({ createOrder: mocks.createOrder }))
vi.mock("@/lib/payments", () => ({
  completeFreeOrder: mocks.completeFreeOrder,
  createPaymentAttempt: mocks.createPaymentAttempt,
}))
vi.mock("@/lib/payments/availability", () => ({
  getEffectivePaymentProvidersForEvent: mocks.getEffectivePaymentProvidersForEvent,
  assertPaymentProviderAvailableForEvent: mocks.assertPaymentProviderAvailableForEvent,
}))
vi.mock("@/lib/payments/errors", () => ({
  createPaymentChannelUnavailableError: () => ({ message: "No payment method" }),
  reportPaymentChannelUnavailable: vi.fn(),
}))
vi.mock("@/lib/events/lifecycle-server", () => ({ assertEventTransactionsOpen: mocks.assertEventTransactionsOpen }))
vi.mock("@/lib/env", () => ({ APP_URL: "https://ticketiv.app" }))
vi.mock("@/lib/supabase-server", () => ({ createServerSupabaseClient: () => null }))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      const query: any = {
        select: () => query,
        eq: () => query,
        in: async () => ({ data: table === "ticket_types" ? mocks.ticketTypePrices : [], error: null }),
        maybeSingle: async () => ({ data: { total_cents: mocks.orderTotal }, error: null }),
      }
      return query
    },
    rpc: mocks.rpc,
  }),
}))

import { startCheckoutAction } from "@/app/(focused)/events/[id]/checkout/actions"

const EVENT = "00000000-0000-4000-8000-000000000401"
const GA = "00000000-0000-4000-8000-0000000000a1"
const base = {
  eventId: EVENT,
  items: [{ ticketTypeId: GA, quantity: 2 }],
  buyerEmail: "ada@example.com",
  buyerFirstName: " Ada ",
  buyerLastName: "Lovelace",
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.ensureCheckoutIdentity.mockResolvedValue({ userId: "guest-1", email: null, isAnonymous: true })
  mocks.createOrder.mockResolvedValue({ order: { id: "order-1" } })
  mocks.completeFreeOrder.mockResolvedValue({ orderId: "order-1", issuedItemCount: 2 })
  mocks.getEffectivePaymentProvidersForEvent.mockResolvedValue(["paystack"])
  mocks.assertPaymentProviderAvailableForEvent.mockResolvedValue("paystack")
  mocks.createPaymentAttempt.mockResolvedValue({ payment: { checkoutUrl: "https://paystack.test/pay" } })
  mocks.orderTotal = 10000
})

describe("startCheckoutAction", () => {
  it("registers free carts without consulting payment providers", async () => {
    mocks.ticketTypePrices = [{ id: GA, price_cents: 0 }]
    mocks.getEffectivePaymentProvidersForEvent.mockResolvedValue([])

    const result = await startCheckoutAction(base)

    expect(result).toEqual({
      ok: true,
      orderId: "order-1",
      checkoutUrl: "/orders/order-1/confirmation",
      provider: "free",
      promo: null,
    })
    expect(mocks.completeFreeOrder).toHaveBeenCalledWith("order-1", "guest-1")
    expect(mocks.getEffectivePaymentProvidersForEvent).not.toHaveBeenCalled()
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled()
  })

  it("passes the buyer's name to the order as the ticket holder", async () => {
    mocks.ticketTypePrices = [{ id: GA, price_cents: 15000 }]

    const result = await startCheckoutAction(base)

    expect(result).toMatchObject({ ok: true, checkoutUrl: "https://paystack.test/pay", provider: "paystack" })
    expect(mocks.createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ purchaserFirstName: "Ada", purchaserLastName: "Lovelace", purchaserEmail: "ada@example.com" }),
    )
    expect(mocks.completeFreeOrder).not.toHaveBeenCalled()
  })

  it("applies the promo code as entered and settles a 100%-off order as free", async () => {
    mocks.ticketTypePrices = [{ id: GA, price_cents: 15000 }]
    mocks.rpc.mockResolvedValue({ data: { applied: true, label: "FULLCOMP", adjustment_cents: -30000 }, error: null })
    mocks.orderTotal = 0

    const result = await startCheckoutAction({ ...base, promoCode: "FULLCOMP" })

    expect(mocks.rpc).toHaveBeenCalledWith("fn_apply_promo_code_to_order", {
      p_order_id: "order-1",
      p_code: "FULLCOMP",
      p_user_id: "guest-1",
    })
    expect(result).toMatchObject({ ok: true, provider: "free", checkoutUrl: "/orders/order-1/confirmation" })
    expect(mocks.createPaymentAttempt).not.toHaveBeenCalled()
  })
})
