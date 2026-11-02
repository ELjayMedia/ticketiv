import { strongestOrganizerRole, type OrganizerRole } from "@ticketiv/shared"

/**
 * One rule, shared by the web workspace (getOrganizerAccess) and the
 * Ticketiv Organizer mobile API: how an org membership, event assignments and
 * platform-admin status combine into an organizer role (ADR 0002).
 */
export interface ResolvedOrganizerAccess {
  storedRole: string | null
  role: OrganizerRole
  isPlatformAdmin: boolean
  /** null = every event in the org; otherwise only these assigned events. */
  eventIds: string[] | null
  /** Events managed through an event-level manager assignment (event-only access). */
  managedEventIds: string[]
}

export interface OrganizerAccessInput {
  storedRole: string | null
  assignments: ReadonlyArray<{ event_id: string; role: string | null }>
  isPlatformAdmin: boolean
}

const RANK: Record<OrganizerRole, number> = { manager: 4, finance: 3, staff: 2, scanner: 1 }

function broader(a: OrganizerRole | null, b: OrganizerRole | null): OrganizerRole | null {
  if (!a) return b
  if (!b) return a
  return RANK[a] >= RANK[b] ? a : b
}

export function resolveOrganizerAccess(input: OrganizerAccessInput): ResolvedOrganizerAccess | null {
  const { storedRole, assignments, isPlatformAdmin } = input
  if (isPlatformAdmin) {
    return { storedRole, role: "manager", isPlatformAdmin, eventIds: null, managedEventIds: [] }
  }

  const orgRole = strongestOrganizerRole([storedRole])
  const assignmentRole = strongestOrganizerRole(assignments.map((a) => a.role))
  // An event assignment never opens org-wide pages (dashboard, finance, team…):
  // on its own it gives at most door access, plus managing that one event.
  const cappedAssignmentRole = assignmentRole === "manager" || assignmentRole === "finance" ? "staff" : assignmentRole
  const role = broader(orgRole, cappedAssignmentRole)
  if (!role) return null

  return {
    storedRole,
    role,
    isPlatformAdmin,
    // An org-level membership covers every event; event-only access is scoped.
    eventIds: orgRole ? null : [...new Set(assignments.map((a) => a.event_id))],
    managedEventIds: orgRole
      ? []
      : assignments.filter((a) => strongestOrganizerRole([a.role]) === "manager").map((a) => a.event_id),
  }
}

export function canWorkEventWith(access: Pick<ResolvedOrganizerAccess, "eventIds">, eventId: string): boolean {
  return access.eventIds === null || access.eventIds.includes(eventId)
}
