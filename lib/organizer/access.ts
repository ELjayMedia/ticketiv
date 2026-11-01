import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import {
  canChangeSettings,
  canManageTeam,
  canOpenSection,
  organizerHomeSection,
  strongestOrganizerRole,
  type OrganizerRole,
  type OrganizerSection,
} from "@ticketiv/shared"
import { createAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

/**
 * Who the signed-in person is inside one organisation's workspace (ADR 0002).
 *
 * Role = the broadest of their org membership and their per-event
 * assignments (event_staff). Platform admins are managers everywhere.
 * Door staff and scanners assigned per event only see those events.
 *
 * Cached per request so the layout and the page share one lookup.
 */
export interface OrganizerAccess {
  userId: string
  /** org_members.role, or null when access comes only from event assignments. */
  storedRole: string | null
  role: OrganizerRole
  isPlatformAdmin: boolean
  /**
   * Events this person may work. null means every event in the org
   * (an org-level member); otherwise only these assigned event ids.
   */
  eventIds: string[] | null
  /** Events this person manages through an event-level manager assignment (event-only access). */
  managedEventIds: string[]
}

export const getOrganizerAccess = cache(async (orgId: string): Promise<OrganizerAccess | null> => {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [membershipRes, assignmentsRes, adminRes] = await Promise.all([
    supabase.from("org_members").select("role").eq("user_id", user.id).eq("org_id", orgId).maybeSingle(),
    // event_staff is hidden from authenticated reads (RLS denies all), so the
    // caller's own assignments are read server-side after authenticating them,
    // as the event workspace layout does. Never reaches the browser.
    createAdminClient()
      .from("event_staff")
      .select("event_id, role, events!inner(org_id)")
      .eq("user_id", user.id)
      .eq("active", true)
      .eq("events.org_id", orgId),
    supabase.from("admin_users").select("user_id").eq("user_id", user.id).eq("active", true).maybeSingle(),
  ])

  const storedRole = membershipRes.data?.role ? String(membershipRes.data.role) : null
  const assignments = (assignmentsRes.data ?? []) as Array<{ event_id: string; role: string | null }>
  const isPlatformAdmin = Boolean(adminRes.data)

  if (isPlatformAdmin) {
    return { userId: user.id, storedRole, role: "manager", isPlatformAdmin, eventIds: null, managedEventIds: [] }
  }

  const orgRole = strongestOrganizerRole([storedRole])
  const assignmentRole = strongestOrganizerRole(assignments.map((a) => a.role))
  // An event assignment never opens org-wide pages (dashboard, finance, team…):
  // on its own it gives at most door access, plus managing that one event.
  const cappedAssignmentRole = assignmentRole === "manager" || assignmentRole === "finance" ? "staff" : assignmentRole
  const role = broader(orgRole, cappedAssignmentRole)
  if (!role) return null

  return {
    userId: user.id,
    storedRole,
    role,
    isPlatformAdmin,
    // An org-level membership covers every event; event-only access is scoped.
    eventIds: orgRole ? null : [...new Set(assignments.map((a) => a.event_id))],
    managedEventIds: orgRole
      ? []
      : assignments.filter((a) => strongestOrganizerRole([a.role]) === "manager").map((a) => a.event_id),
  }
})

const RANK: Record<OrganizerRole, number> = { manager: 4, finance: 3, staff: 2, scanner: 1 }
function broader(a: OrganizerRole | null, b: OrganizerRole | null): OrganizerRole | null {
  if (!a) return b
  if (!b) return a
  return RANK[a] >= RANK[b] ? a : b
}

/** Path where a role starts in an organisation's workspace. */
export function organizerHomePath(orgId: string, role: OrganizerRole): string {
  switch (organizerHomeSection(role)) {
    case "dashboard":
      return `/orgs/${orgId}/dashboard`
    case "events":
      return `/orgs/${orgId}/events`
    default:
      return "/scan"
  }
}

export function canWorkEvent(access: OrganizerAccess, eventId: string): boolean {
  return access.eventIds === null || access.eventIds.includes(eventId)
}

interface RequireOptions {
  /** Event-scoped page: the person must be allowed to work this event. */
  eventId?: string
  /** Extra rule for team pages (owner/admin) or settings pages (owner). */
  team?: boolean
  settings?: boolean
}

/**
 * Gate a workspace page by section. Sends people who can't open it to the
 * place their role starts, so a scanner who follows a dashboard link lands on
 * the scanner rather than an error.
 */
export async function requireOrganizerSection(
  orgId: string,
  section: OrganizerSection,
  options: RequireOptions = {},
): Promise<OrganizerAccess> {
  const access = await getOrganizerAccess(orgId)
  if (!access) redirect("/login")

  const allowed =
    canOpenSection(access.role, section) &&
    (!options.eventId || canWorkEvent(access, options.eventId)) &&
    (!options.team || access.isPlatformAdmin || canManageTeam(access.storedRole)) &&
    (!options.settings || access.isPlatformAdmin || canChangeSettings(access.storedRole))

  if (!allowed) redirect(organizerHomePath(orgId, access.role))
  return access
}

export function canManageEventIn(access: OrganizerAccess, eventId: string): boolean {
  return access.role === "manager" || access.managedEventIds.includes(eventId)
}

/** Event management (overview, edit, tickets, orders, staff, operations) is for managers only. */
export async function requireEventManager(orgId: string, eventId: string): Promise<OrganizerAccess> {
  const access = await requireOrganizerSection(orgId, "events", { eventId })
  if (!canManageEventIn(access, eventId)) redirect(`/orgs/${orgId}/events/${eventId}/door`)
  return access
}

/** Creating events is org-wide management, not something an event assignment grants. */
export async function requireOrgManager(orgId: string): Promise<OrganizerAccess> {
  const access = await requireOrganizerSection(orgId, "events")
  if (access.role !== "manager") redirect(organizerHomePath(orgId, access.role))
  return access
}
