import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createPublicSupabaseClient: vi.fn(),
}))

vi.mock("@/lib/supabase-public", () => ({
  createPublicSupabaseClient: mocks.createPublicSupabaseClient,
}))

import { getPublicEventBySlug, getPublicEventsList } from "@/lib/adapters/events"

describe("public event adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("filters current events by final-end cutoff before pagination", async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null })
    const query: any = {
      gte: vi.fn(() => query),
      lt: vi.fn(() => query),
      ilike: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range,
    }
    const select = vi.fn().mockReturnValue(query)
    const from = vi.fn().mockReturnValue({ select })
    mocks.createPublicSupabaseClient.mockReturnValue({ from })

    await getPublicEventsList({
      lifecycle: "current",
      nowMs: new Date("2026-09-27T12:00:00.000Z").getTime(),
      limit: 10,
      offset: 20,
    })

    expect(query.gte).toHaveBeenCalledWith("event_ends_at", "2026-09-27T09:00:00.000Z")
    expect(query.lt).not.toHaveBeenCalled()
    expect(range).toHaveBeenCalledWith(20, 29)
  })

  it("filters past events before pagination and sorts newest history first", async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null })
    const query: any = {
      gte: vi.fn(() => query),
      lt: vi.fn(() => query),
      ilike: vi.fn(() => query),
      eq: vi.fn(() => query),
      order: vi.fn(() => query),
      range,
    }
    const select = vi.fn().mockReturnValue(query)
    const from = vi.fn().mockReturnValue({ select })
    mocks.createPublicSupabaseClient.mockReturnValue({ from })

    await getPublicEventsList({
      lifecycle: "past",
      nowMs: new Date("2026-09-27T12:00:00.000Z").getTime(),
      limit: 5,
    })

    expect(query.lt).toHaveBeenCalledWith("event_ends_at", "2026-09-27T09:00:00.000Z")
    expect(query.gte).not.toHaveBeenCalled()
    expect(query.order).toHaveBeenCalledWith("starts_at", { ascending: false })
    expect(range).toHaveBeenCalledWith(0, 4)
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
