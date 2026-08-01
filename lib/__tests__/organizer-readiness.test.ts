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
      hasAnyEvent: true,
      hasPublishedEvent: true,
      hasDevice: false,
      hasTeam: true,
    })

    expect(steps.map((step) => [step.id, step.done])).toEqual([
      ["event", true],
      ["profile", true],
      ["payout", true],
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
      hasAnyEvent: true,
      hasPublishedEvent: true,
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
      hasAnyEvent: false,
      hasPublishedEvent: false,
      hasDevice: false,
      hasTeam: false,
    })

    const nextStep = getNextOrganizerSetupStep(steps)

    // A fresh org's motivating job is getting an event on sale — the
    // checklist leads with event creation, not profile polish.
    expect(nextStep).toMatchObject({
      id: "event",
      title: "Create your first event",
      href: "/orgs/org-1/events/new",
    })
  })

  it("keeps a draft-only organizer on the event list until an event is published", () => {
    const steps = buildOrganizerSetupSteps({
      orgId: "org-1",
      hasProfile: true,
      hasPayoutAccount: true,
      hasAnyEvent: true,
      hasPublishedEvent: false,
      hasDevice: true,
      hasTeam: true,
    })

    expect(getNextOrganizerSetupStep(steps)).toMatchObject({
      id: "event",
      title: "Publish your first event",
      href: "/orgs/org-1/events",
      done: false,
    })
  })
})
