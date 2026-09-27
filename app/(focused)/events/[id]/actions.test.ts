import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  ensureCheckoutIdentity: vi.fn(),
  getPublicEventBySlug: vi.fn(),
  createServerSupabaseClient: vi.fn(),
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

import { createSeatHoldAction } from "@/app/(focused)/events/[id]/actions"

const eventId = "00000000-0000-4000-8000-000000000401"

function redirectError(url: string): Error {
  return new Error(`NEXT_REDIRECT:${url}`)
}

function formData(overrides: Record<string, string> = {}) {
  const data = new FormData()
  data.set("eventSlug", overrides.eventSlug ?? "launch-night")
  data.set("quantity", overrides.quantity ?? "2")
  data.set("ticketTypeId", overrides.ticketTypeId ?? "ticket-type-1")
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
    mocks.getPublicEventBySlug.mockResolvedValue({
      id: eventId,
      starts_at: "2026-09-28T18:00:00.000Z",
    })
    mocks.ensureCheckoutIdentity.mockResolvedValue({
      userId: "buyer-1",
      email: null,
      isAnonymous: true,
    })
  })

  it("creates the hold with the same authenticated client used for checkout identity", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "hold-code", error: null })
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle,
    })
    const supabase = { rpc, from }
    mocks.createServerSupabaseClient.mockReturnValue(supabase)

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      "NEXT_REDIRECT:/events/launch-night/checkout?hold=hold-code",
    )

    expect(mocks.ensureCheckoutIdentity).toHaveBeenCalledWith(supabase)
    expect(rpc).toHaveBeenCalledWith("fn_create_seat_hold", {
      p_event_id: eventId,
      p_quantity: 2,
      p_ticket_type_id: "ticket-type-1",
    })
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

  it("blocks stale clients from creating holds after the event lifecycle ends", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-28T02:00:00.001Z"))
    mocks.getPublicEventBySlug.mockResolvedValue({
      id: eventId,
      starts_at: "2026-09-27T18:00:00.000Z",
    })

    const rpc = vi.fn()
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          starts_at: "2026-09-27T18:00:00.000Z",
          ends_at: "2026-09-27T23:00:00.000Z",
        },
        error: null,
      }),
    })
    mocks.createServerSupabaseClient.mockReturnValue({ rpc, from })

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      "NEXT_REDIRECT:/events/launch-night?ended=1",
    )

    expect(rpc).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it("keeps RPC failures on the event-specific checkout error state", async () => {
    const error = { code: "28000", message: "authentication_required" }
    const rpc = vi.fn().mockResolvedValue({ data: null, error })
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })
    mocks.createServerSupabaseClient.mockReturnValue({ rpc, from })
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(createSeatHoldAction(formData())).rejects.toThrow(
      "NEXT_REDIRECT:/events/launch-night/checkout?hold_failed=1",
    )

    expect(errorSpy).toHaveBeenCalledWith("[createSeatHold] failed", error)
    errorSpy.mockRestore()
  })
})
