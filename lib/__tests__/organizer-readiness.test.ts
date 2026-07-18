import { describe, expect, it } from "vitest"

import {
  buildOrganizerSetupSteps,
  getNextOrganizerSetupStep,
  needsOrganizerSetup,
} from "@/lib/data/organizer/readiness"

describe("organizer readiness setup steps", () => {
  it("keeps dashboard and onboarding setup state data-driven", () => {
    const steps = buildOrganizerSetupSteps({
      orgId: "org-1",
      hasProfile: true,
      hasPayoutAccount: true,
      hasEvent: true,
      hasDevice: false,
      hasTeam: true,
    })

    expect(steps.map((step) => [step.id, step.done])).toEqual([
      ["profile", true],
      ["payout", true],
      ["event", true],
      ["scanner", false],
      ["team", true],
    ])
    expect(steps.find((step) => step.id === "profile")?.href).toBe("/orgs/org-1/profile")
    expect(steps.find((step) => step.id === "scanner")?.href).toBe("/orgs/org-1/events")
    expect(needsOrganizerSetup(steps)).toBe(true)
    expect(getNextOrganizerSetupStep(steps)?.id).toBe("scanner")
  })

  it("marks setup complete only when every step is complete", () => {
    const steps = buildOrganizerSetupSteps({
      orgId: "org-1",
      hasProfile: true,
      hasPayoutAccount: true,
      hasEvent: true,
      hasDevice: true,
      hasTeam: true,
    })

    expect(needsOrganizerSetup(steps)).toBe(false)
    expect(getNextOrganizerSetupStep(steps)).toBeNull()
  })

  it("prioritizes the first incomplete setup action in launch onboarding order", () => {
    const steps = buildOrganizerSetupSteps({
      orgId: "org-1",
      hasProfile: false,
      hasPayoutAccount: false,
      hasEvent: false,
      hasDevice: false,
      hasTeam: false,
    })

    const nextStep = getNextOrganizerSetupStep(steps)

    expect(nextStep).toMatchObject({
      id: "profile",
      title: "Complete your profile",
      href: "/orgs/org-1/profile",
    })
  })
})
