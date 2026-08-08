import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("event publication payment readiness", () => {
  it("blocks publication while paid checkout has no operational provider", () => {
    const route = read("app/api/events/[eventId]/publish/route.ts")
    const start = route.indexOf('key: "payment_method"')
    const end = route.indexOf("\n    },", start)
    const paymentCheck = route.slice(start, end)

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(paymentCheck).toContain("recommended: false")
    expect(paymentCheck).toContain("Choose at least one Ticketiv-supported payment method")
    expect(route).toContain("if (publish && !readiness.ready)")
  })

  it("explains that payment readiness is required in the organizer wizard", () => {
    const policies = read("components/event-wizard/steps/PoliciesStep.tsx")

    expect(policies).toContain("Payment methods *")
    expect(policies).toContain("before this event can be published")
    expect(policies).toContain("Payment readiness will remain incomplete")
    expect(policies).not.toContain("You can still publish this event")
    expect(policies).not.toContain("You can publish now")
  })
})
