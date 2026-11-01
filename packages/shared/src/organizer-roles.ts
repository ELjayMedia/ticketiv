/**
 * Organizer app roles (ADR 0002). One mapping shared by the web organizer
 * workspace and the Ticketiv Organizer mobile app, so both show the same
 * sections to the same person.
 *
 *   manager — owner / admin: everything, incl. team (owner/admin) and settings (owner)
 *   finance — finance figures and payouts only
 *   staff   — door staff (organizer_staff): assigned events, scan, guestlist, box office
 *   scanner — scan only
 *
 * The database enforces the same split: app.is_org_manager (owner/admin) for
 * writes, app.is_org_operator (owner/admin/organizer_staff) for door
 * operations (migration 20261102090000_organizer_staff_door_role).
 */

export type OrganizerRole = "manager" | "finance" | "staff" | "scanner"

export type OrganizerSection =
  | "dashboard"
  | "events"
  | "series"
  | "finance"
  | "payouts"
  | "team"
  | "settings"
  | "scan"
  | "guestlist"
  | "boxOffice"

const MANAGER = new Set(["organizer_owner", "organizer_admin", "admin", "organizer"])
const FINANCE = new Set(["finance"])
const STAFF = new Set(["organizer_staff", "staff", "pos"])
const SCANNER = new Set(["scanner", "organizer_scanner", "device"])

/** Strongest first: a person holding several roles gets the broadest one. */
const RANK: Record<OrganizerRole, number> = { manager: 4, finance: 3, staff: 2, scanner: 1 }

/** Map one stored role (org_members.role or event_staff.role) to an organizer role. */
export function organizerRoleFrom(role: string | null | undefined): OrganizerRole | null {
  if (!role) return null
  if (MANAGER.has(role)) return "manager"
  if (FINANCE.has(role)) return "finance"
  if (STAFF.has(role)) return "staff"
  if (SCANNER.has(role)) return "scanner"
  return null
}

/** The broadest organizer role across an org membership and any event assignments. */
export function strongestOrganizerRole(roles: ReadonlyArray<string | null | undefined>): OrganizerRole | null {
  let best: OrganizerRole | null = null
  for (const raw of roles) {
    const role = organizerRoleFrom(raw)
    if (role && (!best || RANK[role] > RANK[best])) best = role
  }
  return best
}

const SECTIONS: Record<OrganizerRole, OrganizerSection[]> = {
  manager: ["dashboard", "events", "series", "finance", "payouts", "team", "settings", "scan", "guestlist", "boxOffice"],
  finance: ["dashboard", "finance", "payouts"],
  staff: ["events", "scan", "guestlist", "boxOffice"],
  scanner: ["scan"],
}

/** Sections this role may open. Team and settings are further limited for managers (see canManageTeam). */
export function organizerSections(role: OrganizerRole): ReadonlyArray<OrganizerSection> {
  return SECTIONS[role]
}

export function canOpenSection(role: OrganizerRole | null, section: OrganizerSection): boolean {
  return role !== null && SECTIONS[role].includes(section)
}

/** Where each role starts when it opens the organizer app. */
export function organizerHomeSection(role: OrganizerRole): OrganizerSection {
  return role === "manager" || role === "finance" ? "dashboard" : role === "staff" ? "events" : "scan"
}

/** Only owners and org admins manage the team; only owners change workspace settings. */
export function canManageTeam(storedRole: string | null | undefined): boolean {
  return storedRole === "organizer_owner" || storedRole === "organizer_admin" || storedRole === "admin" || storedRole === "organizer"
}
export function canChangeSettings(storedRole: string | null | undefined): boolean {
  return storedRole === "organizer_owner" || storedRole === "admin" || storedRole === "organizer"
}

/** Human label for a stored role, for menus and team lists. */
export function organizerRoleLabel(storedRole: string | null | undefined): string {
  switch (storedRole) {
    case "organizer_owner":
      return "Owner"
    case "organizer_admin":
    case "admin":
      return "Admin"
    case "organizer":
      return "Organizer"
    case "finance":
      return "Finance"
    case "organizer_staff":
    case "staff":
      return "Door staff"
    case "pos":
      return "Box office"
    case "scanner":
    case "organizer_scanner":
    case "device":
      return "Scanner"
    default:
      return "Member"
  }
}
