export interface OrganizerSetupStatus {
  orgId: string
  hasProfile: boolean
  hasPayoutAccount: boolean
  hasAnyEvent: boolean
  hasPublishedEvent: boolean
  hasDevice: boolean
  hasTeam: boolean
}

export interface OrganizerSetupStep {
  id: string
  title: string
  description: string
  href: string
  done: boolean
}

// Ordered by the organizer's motivating job: get an event on sale first.
// Profile/payout polish follows — a payout account is required to request
// payouts (fn_request_payout), not to draft or publish an event.
export function buildOrganizerSetupSteps(status: OrganizerSetupStatus): OrganizerSetupStep[] {
  const { orgId, hasAnyEvent } = status

  return [
    {
      id: "event",
      title: hasAnyEvent ? "Publish your first event" : "Create your first event",
      description: hasAnyEvent
        ? "Finish your draft, add ticket types, and go live."
        : "Set up your event, ticket types, and go live.",
      href: hasAnyEvent ? `/orgs/${orgId}/events` : `/orgs/${orgId}/events/new`,
      done: status.hasPublishedEvent,
    },
    {
      id: "profile",
      title: "Complete your profile",
      description: "Add a bio and logo so buyers recognise your brand.",
      href: `/orgs/${orgId}/profile`,
      done: status.hasProfile,
    },
    {
      id: "payout",
      title: "Add a payout account",
      description: "Connect a bank account to receive your revenue.",
      href: `/orgs/${orgId}/payouts/accounts`,
      done: status.hasPayoutAccount,
    },
    {
      id: "scanner",
      title: "Set up scanner devices",
      description: "Register devices so your gate staff can check in attendees.",
      href: `/orgs/${orgId}/events`,
      done: status.hasDevice,
    },
    {
      id: "team",
      title: "Invite your team",
      description: "Add staff, scanners and admins to your organisation.",
      href: `/orgs/${orgId}/team`,
      done: status.hasTeam,
    },
  ]
}

export function needsOrganizerSetup(steps: OrganizerSetupStep[]) {
  return steps.some((step) => !step.done)
}

export function getNextOrganizerSetupStep(steps: OrganizerSetupStep[]) {
  return steps.find((step) => !step.done) ?? null
}
