import { describe, expect, it } from "vitest"
import { ORG_NAV_ITEMS, isOrgNavItemActive, visibleOrgNavItems } from "@/components/quiet/shell/org-nav"

const labels = (items: { label: string }[]) => items.map((i) => i.label)
const item = (label: string) => ORG_NAV_ITEMS.find((i) => i.label === label)!

describe("organizer workspace navigation", () => {
  it("shows owners every workspace section, including Settings", () => {
    expect(labels(visibleOrgNavItems({ role: "manager", storedRole: "organizer_owner", isPlatformAdmin: false }))).toEqual([
      "Dashboard", "Events", "Series", "Finance", "Payouts", "Team", "Settings",
    ])
  })

  it("hides owner-only Settings from admins, and shows platform admins everything", () => {
    expect(labels(visibleOrgNavItems({ role: "manager", storedRole: "organizer_admin", isPlatformAdmin: false }))).not.toContain("Settings")
    expect(labels(visibleOrgNavItems({ role: "manager", storedRole: null, isPlatformAdmin: true }))).toContain("Settings")
  })

  it("gives finance a money-only menu", () => {
    expect(labels(visibleOrgNavItems({ role: "finance", storedRole: "finance", isPlatformAdmin: false }))).toEqual([
      "Dashboard", "Finance", "Payouts",
    ])
  })

  it("gives door staff their events and the scanner", () => {
    expect(labels(visibleOrgNavItems({ role: "staff", storedRole: "organizer_staff", isPlatformAdmin: false }))).toEqual([
      "Events", "Scan",
    ])
  })

  it("gives scanners only the scanner, which opens /scan", () => {
    const items = visibleOrgNavItems({ role: "scanner", storedRole: null, isPlatformAdmin: false })
    expect(labels(items)).toEqual(["Scan"])
    expect(items[0].href).toBe("/scan")
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
