import { describe, expect, it } from "vitest"
import { PERSONAL_LANDING, pickLanding } from "@/lib/identity/context"
import type { UserContext } from "@/lib/data/identity/contexts"

const personal: UserContext = { key: "personal", kind: "personal", label: "Personal", href: "/me" } as UserContext
const org: UserContext = { key: "org:1", kind: "org", label: "Sunset Collective", href: "/orgs/1/dashboard" } as UserContext
const scan: UserContext = { key: "scan", kind: "scan", label: "Scanner", href: "/scan" } as UserContext

describe("pickLanding (post-login destination)", () => {
  it("sends attendees to Discover, not the profile page", () => {
    expect(PERSONAL_LANDING).toBe("/")
    expect(pickLanding([], null)).toBe("/")
    expect(pickLanding([personal], null)).toBe("/")
  })

  it("sends organizers to their organisation dashboard", () => {
    expect(pickLanding([personal, org], null)).toBe("/orgs/1/dashboard")
    expect(pickLanding([personal, org, scan], null)).toBe("/orgs/1/dashboard")
  })

  it("honours the last-used context, with Personal landing on Discover", () => {
    expect(pickLanding([personal, org], "personal")).toBe("/")
    expect(pickLanding([personal, org, scan], "scan")).toBe("/scan")
  })

  it("ignores a stale last-used context", () => {
    expect(pickLanding([personal, org], "org:gone")).toBe("/orgs/1/dashboard")
  })

  it("sends door-only staff to the scanner", () => {
    expect(pickLanding([personal, scan], null)).toBe("/scan")
  })
})
