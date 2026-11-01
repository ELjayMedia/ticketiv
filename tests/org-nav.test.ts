import { describe, expect, it } from "vitest"
import { ORG_NAV_ITEMS, isOrgNavItemActive, visibleOrgNavItems } from "@/components/quiet/shell/org-nav"

const labels = (items: { label: string }[]) => items.map((i) => i.label)
const item = (label: string) => ORG_NAV_ITEMS.find((i) => i.label === label)!

describe("organizer workspace navigation", () => {
  it("shows owners every section, including Settings", () => {
    expect(labels(visibleOrgNavItems({ canManage: true, isOwner: true }))).toEqual([
      "Dashboard", "Events", "Series", "Finance", "Payouts", "Team", "Settings",
    ])
  })

  it("hides owner-only Settings from other managers", () => {
    expect(labels(visibleOrgNavItems({ canManage: true, isOwner: false }))).not.toContain("Settings")
  })

  it("shows staff and scanners only the sections they can open", () => {
    expect(labels(visibleOrgNavItems({ canManage: false, isOwner: false }))).toEqual(["Dashboard", "Events"])
  })

  it("marks the section for nested pages as active", () => {
    expect(isOrgNavItemActive(item("Events"), "o1", "/orgs/o1/events/e1/orders")).toBe(true)
    expect(isOrgNavItemActive(item("Dashboard"), "o1", "/orgs/o1/onboarding")).toBe(true)
    expect(isOrgNavItemActive(item("Settings"), "o1", "/orgs/o1/profile")).toBe(true)
    expect(isOrgNavItemActive(item("Payouts"), "o1", "/orgs/o1/payouts/accounts")).toBe(true)
  })

  it("does not confuse sections that share a prefix or another org", () => {
    expect(isOrgNavItemActive(item("Events"), "o1", "/orgs/o1/events-archive")).toBe(false)
    expect(isOrgNavItemActive(item("Events"), "o1", "/orgs/o2/events")).toBe(false)
  })
})
