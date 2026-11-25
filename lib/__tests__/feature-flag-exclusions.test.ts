import { beforeEach, describe, expect, it, vi } from "vitest"

// Per-organisation / per-event exclusions on top of the platform flag.
// An exclusion only ever closes a feature, an organisation exclusion covers
// all its events, and unreadable exclusions fail closed.

import { featureOpenFor } from "@/lib/feature-flags-core"

const state: {
  flags: { data: unknown; error: unknown }
  exclusions: { data: unknown; error: unknown }
  event: { data: unknown; error: unknown }
} = { flags: { data: [], error: null }, exclusions: { data: [], error: null }, event: { data: null, error: null } }

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        is: async () => state.flags,
        eq: (_col: string, _val: string) =>
          table === "feature_flag_exclusions"
            ? Promise.resolve(state.exclusions)
            : { maybeSingle: async () => state.event },
      }),
    }),
  }),
}))
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: (fn: unknown) => fn,
}))

import { assertFeatureEnabled, isFeatureEnabled } from "@/lib/feature-flags"

const ORG_A = "00000000-0000-4000-8000-00000000000a"
const ORG_B = "00000000-0000-4000-8000-00000000000b"
const EVENT_1 = "00000000-0000-4000-8000-000000000001"
const EVENT_2 = "00000000-0000-4000-8000-000000000002"

beforeEach(() => {
  state.flags = { data: [{ key: "resale_enabled", enabled: true }], error: null }
  state.exclusions = { data: [], error: null }
  state.event = { data: { org_id: ORG_A }, error: null }
})

describe("featureOpenFor", () => {
  it("never opens a feature that is off platform-wide", () => {
    expect(featureOpenFor(false, [], { orgId: ORG_A, eventId: EVENT_1 })).toBe(false)
  })
  it("closes an excluded event only", () => {
    const ex = [{ orgId: null, eventId: EVENT_1 }]
    expect(featureOpenFor(true, ex, { orgId: ORG_A, eventId: EVENT_1 })).toBe(false)
    expect(featureOpenFor(true, ex, { orgId: ORG_A, eventId: EVENT_2 })).toBe(true)
  })
  it("closes every event of an excluded organisation", () => {
    const ex = [{ orgId: ORG_A, eventId: null }]
    expect(featureOpenFor(true, ex, { orgId: ORG_A, eventId: EVENT_2 })).toBe(false)
    expect(featureOpenFor(true, ex, { orgId: ORG_B, eventId: EVENT_2 })).toBe(true)
  })
})

describe("isFeatureEnabled with a scope", () => {
  it("is open when nothing is excluded", async () => {
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_1 })).resolves.toBe(true)
  })

  it("closes an excluded event", async () => {
    state.exclusions = { data: [{ org_id: null, event_id: EVENT_1 }], error: null }
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_1 })).resolves.toBe(false)
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_2 })).resolves.toBe(true)
  })

  it("applies an organisation exclusion to an event by looking up its organisation", async () => {
    state.exclusions = { data: [{ org_id: ORG_A, event_id: null }], error: null }
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_2 })).resolves.toBe(false)
    state.event = { data: { org_id: ORG_B }, error: null }
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_2 })).resolves.toBe(true)
  })

  it("fails closed when exclusions can't be read", async () => {
    state.exclusions = { data: null, error: { message: "boom" } }
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_1 })).resolves.toBe(false)
  })

  it("fails closed when the event's organisation can't be read", async () => {
    state.exclusions = { data: [{ org_id: ORG_A, event_id: null }], error: null }
    state.event = { data: null, error: { message: "boom" } }
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_1 })).resolves.toBe(false)
  })

  it("keeps the platform check first: off stays off whatever the scope", async () => {
    state.flags = { data: [{ key: "resale_enabled", enabled: false }], error: null }
    await expect(isFeatureEnabled("resale_enabled", { eventId: EVENT_1 })).resolves.toBe(false)
  })

  it("assertFeatureEnabled throws the generic message for an excluded organisation", async () => {
    state.exclusions = { data: [{ org_id: ORG_A, event_id: null }], error: null }
    await expect(assertFeatureEnabled("resale_enabled", { orgId: ORG_A })).rejects.toThrow(/not available/i)
  })
})
