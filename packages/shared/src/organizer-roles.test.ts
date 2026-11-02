import { describe, expect, it } from "vitest"

import {
  canChangeSettings,
  canManageTeam,
  canViewFinance,
  canOpenSection,
  organizerHomeSection,
  organizerRoleFrom,
  organizerRoleLabel,
  organizerSections,
  strongestOrganizerRole,
} from "./organizer-roles"

describe("organizer roles (ADR 0002)", () => {
  it("maps stored roles to the four organizer roles", () => {
    expect(organizerRoleFrom("organizer_owner")).toBe("manager")
    expect(organizerRoleFrom("organizer_admin")).toBe("manager")
    expect(organizerRoleFrom("finance")).toBe("finance")
    expect(organizerRoleFrom("organizer_staff")).toBe("staff")
    expect(organizerRoleFrom("pos")).toBe("staff")
    expect(organizerRoleFrom("scanner")).toBe("scanner")
    expect(organizerRoleFrom("organizer_scanner")).toBe("scanner")
    expect(organizerRoleFrom("attendee")).toBeNull()
  })

  it("treats organizer_staff as door staff, not a manager", () => {
    expect(canOpenSection("staff", "events")).toBe(true)
    expect(canOpenSection("staff", "scan")).toBe(true)
    expect(canOpenSection("staff", "guestlist")).toBe(true)
    expect(canOpenSection("staff", "boxOffice")).toBe(true)
    for (const section of ["dashboard", "series", "finance", "payouts", "team", "settings"] as const) {
      expect(canOpenSection("staff", section)).toBe(false)
    }
  })

  it("keeps finance to money pages and scanners to scanning", () => {
    expect(organizerSections("finance")).toEqual(["dashboard", "finance", "payouts"])
    expect(organizerSections("scanner")).toEqual(["scan"])
    expect(canOpenSection(null, "scan")).toBe(false)
  })

  it("picks the broadest role across org membership and event assignments", () => {
    expect(strongestOrganizerRole(["scanner", "organizer_staff"])).toBe("staff")
    expect(strongestOrganizerRole([null, "scanner"])).toBe("scanner")
    expect(strongestOrganizerRole(["organizer_staff", "organizer_admin"])).toBe("manager")
    expect(strongestOrganizerRole([])).toBeNull()
  })

  it("starts each role where its work is", () => {
    expect(organizerHomeSection("manager")).toBe("dashboard")
    expect(organizerHomeSection("finance")).toBe("dashboard")
    expect(organizerHomeSection("staff")).toBe("events")
    expect(organizerHomeSection("scanner")).toBe("scan")
  })

  it("limits team and settings within managers", () => {
    expect(canManageTeam("organizer_admin")).toBe(true)
    expect(canManageTeam("organizer_staff")).toBe(false)
    expect(canChangeSettings("organizer_owner")).toBe(true)
    expect(canChangeSettings("organizer_admin")).toBe(false)
  })

  it("limits finance and payouts to owners and finance", () => {
    expect(canViewFinance("organizer_owner")).toBe(true)
    expect(canViewFinance("finance")).toBe(true)
    expect(canViewFinance("organizer_admin")).toBe(false)
    expect(canViewFinance("organizer_staff")).toBe(false)
  })

  it("labels roles for people", () => {
    expect(organizerRoleLabel("organizer_staff")).toBe("Door staff")
    expect(organizerRoleLabel("pos")).toBe("Box office")
    expect(organizerRoleLabel("organizer_scanner")).toBe("Scanner")
  })
})
