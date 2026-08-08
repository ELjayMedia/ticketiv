import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8")
}

describe("event publication payment readiness", () => {
  it("does not block publication while paid checkout has no operational provider", () => {
    const route = read("app/api/events/[eventId]/publish/route.ts")
    const start = route.indexOf('key: "payment_method"')
    const end = route.indexOf("\n    },", start)
    const paymentCheck = route.slice(start, end)

    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    expect(paymentCheck).toContain("recommended: true")
    expect(paymentCheck).toContain("paid checkout stays unavailable")
  })

  it("explains the distinction in the organizer wizard", () => {
    const policies = read("components/event-wizard/steps/PoliciesStep.tsx")

    expect(policies).toContain("You can still publish this event")
    expect(policies).toContain("Paid checkout will remain unavailable")
    expect(policies).not.toContain("before this event can be published")
  })
})
