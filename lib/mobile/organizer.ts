import "server-only"

import { createClient, type User } from "@supabase/supabase-js"
import {
  canChangeSettings,
  canManageTeam,
  canOpenSection,
  organizerRoleLabel,
  organizerSections,
  type ClaimedDeviceSetup,
  type OrganizerRole,
  type OrganizerSection,
} from "@ticketiv/shared"

import { getRequiredSupabasePublicConfig } from "@/lib/env-public"
import { canWorkEventWith, resolveOrganizerAccess, type ResolvedOrganizerAccess } from "@/lib/organizer/resolve"
import {
  claimDeviceSetupCode,
  createDeviceSetupCode,
  DeviceProvisioningError,
} from "@/lib/scanner/device-provisioning"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Ticketiv Organizer mobile API (ADR 0002). The app signs in with email and
 * password directly against Supabase Auth and sends the access token as
 * `Authorization: Bearer …`. Every function here starts from that verified
 * user and only ever reads that user's own memberships and assignments.
 */

export class MobileOrganizerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export async function getBearerUser(request: Request): Promise<User | null> {
  const header = request.headers.get("authorization") ?? ""
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  if (!match) return null

  const config = getRequiredSupabasePublicConfig()
  const client = createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const { data, error } = await client.auth.getUser(match[1])
  if (error || !data.user) return null
  return data.user
}

export interface MobileWorkspace {
  orgId: string
  orgName: string
  role: OrganizerRole
  roleLabel: string
  sections: OrganizerSection[]
  /** null = every event in the org. */
  eventIds: string[] | null
}

type Assignment = { event_id: string; role: string | null; org_id: string; org_name: string | null }

async function loadAccessRows(userId: string) {
  const admin = createAdminClient()
  const [membershipsRes, assignmentsRes, adminRes] = await Promise.all([
    admin.from("org_members").select("org_id, role, organizations(name)").eq("user_id", userId),
    admin
      .from("event_staff")
      .select("event_id, role, events!inner(org_id, organizations(name))")
      .eq("user_id", userId)
      .eq("active", true),
    admin.from("admin_users").select("user_id").eq("user_id", userId).eq("active", true).maybeSingle(),
  ])
  if (membershipsRes.error || assignmentsRes.error) {
    throw new MobileOrganizerError("Unable to load your organisations", 500)
  }

  const memberships = (membershipsRes.data ?? []).map((row: any) => ({
    orgId: String(row.org_id),
    role: row.role ? String(row.role) : null,
    orgName: row.organizations?.name ? String(row.organizations.name) : null,
  }))
  const assignments: Assignment[] = (assignmentsRes.data ?? []).map((row: any) => ({
    event_id: String(row.event_id),
    role: row.role ? String(row.role) : null,
    org_id: String(row.events?.org_id),
    org_name: row.events?.organizations?.name ? String(row.events.organizations.name) : null,
  }))
  return { memberships, assignments, isPlatformAdmin: Boolean(adminRes.data) }
}

function accessFor(
  rows: Awaited<ReturnType<typeof loadAccessRows>>,
  orgId: string,
): ResolvedOrganizerAccess | null {
  return resolveOrganizerAccess({
    storedRole: rows.memberships.find((m) => m.orgId === orgId)?.role ?? null,
    assignments: rows.assignments.filter((a) => a.org_id === orgId),
    isPlatformAdmin: rows.isPlatformAdmin,
  })
}

/**
 * Organisations this person works in, with their role in each. Platform admins
 * see only orgs they belong to or are assigned in; the admin console is web-only.
 */
export async function listMobileWorkspaces(userId: string): Promise<MobileWorkspace[]> {
  const rows = await loadAccessRows(userId)
  const names = new Map<string, string>()
  for (const m of rows.memberships) names.set(m.orgId, m.orgName ?? "Organisation")
  for (const a of rows.assignments) if (!names.has(a.org_id)) names.set(a.org_id, a.org_name ?? "Organisation")

  const workspaces: MobileWorkspace[] = []
  for (const [orgId, orgName] of names) {
    const access = accessFor(rows, orgId)
    if (!access) continue
    workspaces.push({
      orgId,
      orgName,
      role: access.role,
      roleLabel: access.storedRole
        ? organizerRoleLabel(access.storedRole)
        : organizerRoleLabel(access.role === "scanner" ? "scanner" : "organizer_staff"),
      // Same extra limits as the web nav: Team for owner/admin, Settings for owner.
      sections: organizerSections(access.role).filter(
        (section) =>
          (section !== "team" || access.isPlatformAdmin || canManageTeam(access.storedRole)) &&
          (section !== "settings" || access.isPlatformAdmin || canChangeSettings(access.storedRole)),
      ),
      eventIds: access.eventIds,
    })
  }
  return workspaces.sort((a, b) => a.orgName.localeCompare(b.orgName))
}

export interface MobileEvent {
  id: string
  title: string
  startsAt: string | null
  endsAt: string | null
  status: string
}

async function requireAccess(userId: string, orgId: string, section: OrganizerSection, eventId?: string) {
  const rows = await loadAccessRows(userId)
  const access = accessFor(rows, orgId)
  if (!access || !canOpenSection(access.role, section)) {
    throw new MobileOrganizerError("You don't have access to this", 403)
  }
  if (eventId && !canWorkEventWith(access, eventId)) {
    throw new MobileOrganizerError("You aren't assigned to this event", 403)
  }
  return access
}

/** Events this person can scan in an organisation, soonest first. */
export async function listMobileScanEvents(userId: string, orgId: string): Promise<MobileEvent[]> {
  const access = await requireAccess(userId, orgId, "scan")
  if (access.eventIds?.length === 0) return []

  let query = createAdminClient()
    .from("events")
    .select("id, title, starts_at, ends_at, status")
    .eq("org_id", orgId)
    .neq("status", "draft")
    .order("starts_at", { ascending: true })
  if (access.eventIds) query = query.in("id", access.eventIds)

  const { data, error } = await query
  if (error) throw new MobileOrganizerError("Unable to load events", 500)
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    title: String(row.title ?? "Untitled event"),
    startsAt: row.starts_at ? String(row.starts_at) : null,
    endsAt: row.ends_at ? String(row.ends_at) : null,
    status: String(row.status ?? ""),
  }))
}

/**
 * Pair this phone as a scanner for an event the signed-in person may scan.
 * Same path as a setup code an organizer would create and hand over, so the
 * native scanner, offline manifest and sync behave identically.
 */
export async function issueMobileScannerSetup(input: {
  userId: string
  orgId: string
  eventId: string
  deviceId: string | null
  label: string | null
}): Promise<ClaimedDeviceSetup> {
  await requireAccess(input.userId, input.orgId, "scan", input.eventId)

  const { data: event } = await createAdminClient()
    .from("events")
    .select("id, org_id")
    .eq("id", input.eventId)
    .maybeSingle()
  if (!event || event.org_id !== input.orgId) throw new MobileOrganizerError("Event not found", 404)

  const label = input.label?.trim() || "Organizer app"
  try {
    const setup = await createDeviceSetupCode({
      orgId: input.orgId,
      eventId: input.eventId,
      createdBy: input.userId,
      label,
      ttlMinutes: 2,
    })
    return await claimDeviceSetupCode({ code: setup.code, deviceId: input.deviceId, label })
  } catch (error) {
    if (error instanceof DeviceProvisioningError) throw new MobileOrganizerError(error.message, error.status)
    throw error
  }
}
