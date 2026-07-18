export interface OrganizerSetupStatus {
  orgId: string
  hasProfile: boolean
  hasPayoutAccount: boolean
  hasEvent: boolean
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

export function buildOrganizerSetupSteps(status: OrganizerSetupStatus): OrganizerSetupStep[] {
  const { orgId } = status

  return [
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
      id: "event",
      title: "Create your first event",
      description: "Set up your event, ticket types, and go live.",
      href: `/orgs/${orgId}/events/new`,
      done: status.hasEvent,
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
