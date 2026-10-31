import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  ensureCheckoutIdentity: vi.fn(),
  getPublicEventBySlug: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  loadCheckoutAvailability: vi.fn(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  notFound: mocks.notFound,
}))
vi.mock("@/lib/auth/checkout-identity", () => ({
  ensureCheckoutIdentity: mocks.ensureCheckoutIdentity,
}))
vi.mock("@/lib/adapters/events", () => ({
  getPublicEventBySlug: mocks.getPublicEventBySlug,
}))
vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock("@/lib/checkout/availability", () => ({
  loadCheckoutAvailability: mocks.loadCheckoutAvailability,
}))

import { createSeatHoldAction } from "@/app/(focused)/events/[id]/actions"

const eventId = "00000000-0000-4000-8000-000000000401"
const GA = "00000000-0000-4000-8000-0000000000a1"
const VIP = "00000000-0000-4000-8000-0000000000b2"

function ticketType(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: id === GA ? "General" : "VIP",
    price_cents: 10000,
    currency: "SZL",
    remaining: 50,
    sales_status: "on_sale",
    per_user_limit: null,
    per_order_limit: null,
    ...overrides,
  }
}

function redirectError(url: string): Error {
  return new Error(`NEXT_REDIRECT:${url}`)
}

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData()
  data.set("eventSlug", overrides.eventSlug ?? "launch-night")
  data.set("quantity", overrides.quantity ?? "2")
  data.set("ticketTypeId", overrides.ticketTypeId ?? GA)
  if (overrides.items) data.set("items", overrides.items)
  return data
}

describe("createSeatHoldAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.redirect.mockImplementation((url: string) => {
      throw redirectError(url)
    })
    mocks.notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND")
    })
    mocks.getPublicEventBySlug.mockResolvedValue({ id: eventId })
    mocks.loadCheckoutAvailability.mockResolvedValue({
      ticketTypes: [ticketType(GA), ticketType(VIP, { remaining: 1 })],
      plan: null,
      orgId: null,
    })
    mocks.ensureCheckoutIdentity.mockResolvedValue({
      userId: "buyer-1",
      email: null,
      isAnonymous: true,
    })
  })

  it("creates the hold with the same authenticated client used for checkout identity", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "hold-code", error: null })
    const supabase = { rpc }
    mocks.createServerSupabaseClient.mockReturnValue(supabase)

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      `NEXT_REDIRECT:/events/launch-night/checkout?hold=hold-code&items=${encodeURIComponent(`${GA}:2`)}`,
    )

    expect(mocks.ensureCheckoutIdentity).toHaveBeenCalledWith(supabase)
    expect(rpc).toHaveBeenCalledWith("fn_create_seat_hold", {
      p_event_id: eventId,
      p_quantity: 2,
      p_ticket_type_id: GA,
    })
  })

  it("holds a multi-type cart for its total quantity, clamped to live stock", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "hold-code", error: null })
    mocks.createServerSupabaseClient.mockReturnValue({ rpc })

    await expect(
      createSeatHoldAction(formData({ items: `${GA}:3,${VIP}:4` })),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/events/launch-night/checkout?hold=hold-code&items=${encodeURIComponent(`${GA}:3,${VIP}:1`)}`,
    )

    expect(rpc).toHaveBeenCalledWith("fn_create_seat_hold", {
      p_event_id: eventId,
      p_quantity: 4,
      p_ticket_type_id: null,
    })
  })

  it("reopens the picker without holding when nothing in the cart is available", async () => {
    const rpc = vi.fn()
    mocks.createServerSupabaseClient.mockReturnValue({ rpc })
    mocks.loadCheckoutAvailability.mockResolvedValue({
      ticketTypes: [ticketType(GA, { remaining: 0 })],
      plan: null,
      orgId: null,
    })

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      `NEXT_REDIRECT:/events/launch-night?tickets=1&items=${encodeURIComponent(`${GA}:2`)}&unavailable=1`,
    )
    expect(rpc).not.toHaveBeenCalled()
  })

  it("sends the buyer to login when checkout identity cannot be established", async () => {
    const rpc = vi.fn()
    const supabase = { rpc }
    mocks.createServerSupabaseClient.mockReturnValue(supabase)
    mocks.ensureCheckoutIdentity.mockResolvedValue(null)

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      "NEXT_REDIRECT:/login?from=%2Fevents%2Flaunch-night",
    )

    expect(rpc).not.toHaveBeenCalled()
  })

  it("does not attempt identity or RPC work when Supabase is unavailable", async () => {
    mocks.createServerSupabaseClient.mockReturnValue(null)

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      "NEXT_REDIRECT:/login?from=%2Fevents%2Flaunch-night",
    )

    expect(mocks.ensureCheckoutIdentity).not.toHaveBeenCalled()
  })

  it("returns RPC failures to the picker with the cart intact", async () => {
    const error = { code: "28000", message: "authentication_required" }
    const rpc = vi.fn().mockResolvedValue({ data: null, error })
    mocks.createServerSupabaseClient.mockReturnValue({ rpc })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      `NEXT_REDIRECT:/events/launch-night?tickets=1&items=${encodeURIComponent(`${GA}:2`)}&hold_failed=1`,
    )

    expect(errorSpy).toHaveBeenCalledWith("[createSeatHold] failed", error)
    errorSpy.mockRestore()
  })
})
