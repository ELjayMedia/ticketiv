import { beforeEach, describe, expect, it, vi } from "vitest"

// TICK-346 — these flags decide whether resale, waitlist and POS are reachable
// at all. The behaviour that matters most is what happens when the flag table
// cannot be read: an unlaunched money path must stay shut.

const select = vi.fn()

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ is: (...args: unknown[]) => select(...args) }) }),
  }),
}))
// react's cache() memoises per-request; in tests we want each call to re-read.
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: (fn: unknown) => fn,
}))

import { assertFeatureEnabled, getPlatformFeatureFlags, isFeatureEnabled } from "@/lib/feature-flags"

beforeEach(() => {
  select.mockReset()
})

describe("getPlatformFeatureFlags", () => {
  it("maps rows to a key/enabled record", async () => {
    select.mockResolvedValue({
      data: [
        { key: "resale_enabled", enabled: false },
        { key: "series_enabled", enabled: true },
      ],
      error: null,
    })

    await expect(getPlatformFeatureFlags()).resolves.toEqual({
      resale_enabled: false,
      series_enabled: true,
    })
  })

  it("scopes the query to platform-level rows", async () => {
    select.mockResolvedValue({ data: [], error: null })
    await getPlatformFeatureFlags()
    expect(select).toHaveBeenCalledWith("org_id", null)
  })
})

describe("fail-closed behaviour", () => {
  it("treats a query error as everything disabled", async () => {
    select.mockResolvedValue({ data: null, error: { message: "connection reset" } })
    await expect(isFeatureEnabled("resale_enabled")).resolves.toBe(false)
  })

  it("treats a thrown client error as everything disabled", async () => {
    select.mockRejectedValue(new Error("no service role key"))
    await expect(isFeatureEnabled("pos_enabled")).resolves.toBe(false)
  })

  // A flag row that was deleted must not read as enabled.
  it("treats a missing flag as disabled", async () => {
    select.mockResolvedValue({ data: [{ key: "series_enabled", enabled: true }], error: null })
    await expect(isFeatureEnabled("waitlist_enabled")).resolves.toBe(false)
  })

  it("requires exactly true, not merely truthy", async () => {
    select.mockResolvedValue({ data: [{ key: "resale_enabled", enabled: null }], error: null })
    await expect(isFeatureEnabled("resale_enabled")).resolves.toBe(false)
  })
})

describe("isFeatureEnabled", () => {
  it("returns true for an enabled flag", async () => {
    select.mockResolvedValue({ data: [{ key: "guestlist_enabled", enabled: true }], error: null })
    await expect(isFeatureEnabled("guestlist_enabled")).resolves.toBe(true)
  })
})

describe("assertFeatureEnabled", () => {
  it("throws when the feature is off", async () => {
    select.mockResolvedValue({ data: [{ key: "pos_enabled", enabled: false }], error: null })
    await expect(assertFeatureEnabled("pos_enabled")).rejects.toThrow(/not available/i)
  })

  it("resolves when the feature is on", async () => {
    select.mockResolvedValue({ data: [{ key: "pos_enabled", enabled: true }], error: null })
    await expect(assertFeatureEnabled("pos_enabled")).resolves.toBeUndefined()
  })

  // The error is shown to users; it must not disclose the flag name or that a
  // switch exists.
  it("does not leak the flag key in its message", async () => {
    select.mockResolvedValue({ data: [], error: null })
    await expect(assertFeatureEnabled("resale_enabled")).rejects.not.toThrow(/resale_enabled/)
  })
})
