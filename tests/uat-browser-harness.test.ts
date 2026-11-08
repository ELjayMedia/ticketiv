import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { isUatSeedAcknowledgement } from "@/e2e/support/uat-auth"

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("shared UAT browser harness", () => {
  it("accepts both production seed contracts and rejects incomplete acknowledgements", () => {
    expect(isUatSeedAcknowledgement({ ok: true, currency: "ZAR" })).toBe(true)
    expect(isUatSeedAcknowledgement({ seeded: true })).toBe(true)
    expect(isUatSeedAcknowledgement({ ok: true, currency: "SZL" })).toBe(false)
    expect(isUatSeedAcknowledgement({ seeded: false })).toBe(false)
    expect(isUatSeedAcknowledgement(null)).toBe(false)
  })

  it("restores discovery after the destructive fixture reseed and proves its currency", () => {
    const helper = source("e2e/support/uat-auth.ts")
    const mainSeed = helper.indexOf('admin.rpc("fn_seed_uat_fixtures")')
    const discoverySeed = helper.indexOf('admin.rpc("fn_seed_public_discovery_event")')

    expect(mainSeed).toBeGreaterThan(-1)
    expect(discoverySeed).toBeGreaterThan(mainSeed)
    expect(helper).toContain('.eq("id", "da7a0004-0000-4000-8000-000000000001")')
    expect(helper).toContain('ticketType?.currency !== "ZAR"')
    expect(helper).toContain("Per-spec cleanup must not remove the workflow-scoped discovery fixture")
    expect(helper).not.toContain('admin.rpc("fn_teardown_public_discovery_event")')
  })

  it("does not confuse role onboarding with the one-time handle picker", () => {
    const middleware = source("lib/supabase/middleware.ts")

    expect(middleware).toContain('if (path === "/onboarding" && (await hasHandle()))')
    expect(middleware).not.toContain('if (await hasHandle()) {')
  })
})
