import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPublicSupabaseClient: vi.fn(),
}))

vi.mock("@/lib/supabase-public", () => ({
  createPublicSupabaseClient: mocks.createPublicSupabaseClient,
}))

import { getPublicEventBySlug } from "@/lib/adapters/events"

describe("public event adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("treats a missing slug as a normal null result without error logging", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    mocks.createPublicSupabaseClient.mockReturnValue({ from })

    await expect(getPublicEventBySlug("missing-event")).resolves.toBeNull()

    expect(from).toHaveBeenCalledWith("v_event_public")
    expect(eq).toHaveBeenCalledWith("slug", "missing-event")
    expect(maybeSingle).toHaveBeenCalledOnce()
    expect(consoleError).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it("still logs genuine database query failures", async () => {
    const queryError = { code: "XX000", message: "database unavailable" }
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: queryError })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

    mocks.createPublicSupabaseClient.mockReturnValue({ from })

    await expect(getPublicEventBySlug("launch-night")).resolves.toBeNull()

    expect(consoleError).toHaveBeenCalledWith("[v0] Error fetching event by slug:", queryError)

    consoleError.mockRestore()
  })
})
