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

  it("uses run-owned Auth users and deterministic checkout identifiers", () => {
    const helper = source("e2e/support/uat-auth.ts")
    const workflow = source(".github/workflows/shared-uat.yml")

    expect(helper).toContain("admin.auth.admin.createUser({")
    expect(helper).toContain('source: "shared-uat"')
    expect(helper).not.toContain("admin.auth.admin.updateUserById(persona.id")
    expect(workflow).toContain("E2E_TEST_EVENT_SLUG: uat-public-discovery-event")
    expect(workflow).toContain("E2E_TEST_BUYER_EMAIL: uat-checkout@ticketiv.app")
    expect(workflow).not.toContain("E2E_TEST_EVENT_SLUG: ${{ secrets.E2E_TEST_EVENT_SLUG }}")
    expect(workflow).not.toContain("E2E_TEST_BUYER_EMAIL: ${{ secrets.E2E_TEST_BUYER_EMAIL }}")
  })

  it("uses attendee-visible refund fixtures and exact organization headings", () => {
    const refundSpec = source("e2e/refunded-ticket-propagation.spec.ts")
    const boundarySpec = source("e2e/authenticated-org-boundaries.spec.ts")

    expect(refundSpec).toContain('const PUBLIC_EVENT_ID = "da7a0003-0000-4000-8000-000000000004"')
    expect(refundSpec).toContain('const PUBLIC_TICKET_TYPE_ID = "da7a0004-0000-4000-8000-000000000004"')
    expect(refundSpec).toContain("ticket_type_id: PUBLIC_TICKET_TYPE_ID")
    expect(refundSpec).toContain("p_event_id: PUBLIC_EVENT_ID")
    expect(refundSpec).toContain('getByRole("img", { name: /ticket qr code/i })')
    expect(refundSpec).not.toContain('getByText("No QR"')
    expect(boundarySpec).toContain('test.setTimeout(180_000)')
    expect(boundarySpec).toContain('{ path: "/scan/setup", heading: "Scanner setup" }')
    expect(boundarySpec).toContain('path: `/orgs/${UAT_ORGS.alpha}/events`, heading: "My events"')
    expect(boundarySpec).toContain('name: roleHome.heading, exact: true')
    expect(boundarySpec).toContain('name: "UAT Beta Events", exact: true')
  })

  it("does not confuse role onboarding with the one-time handle picker", () => {
    const middleware = source("lib/supabase/middleware.ts")

    expect(middleware).toContain('if (path === "/onboarding" && (await hasHandle()))')
    expect(middleware).not.toContain('if (await hasHandle()) {')
  })
})
