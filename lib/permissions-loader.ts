// Server-side permissions loader
// Fetches org_members, event_staff, and admin_users for current user

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { OrgMembership, EventStaff, Permissions } from "@/lib/rbac"
import { getDemoSession } from "@/lib/demo-auth"

export interface UserAuthzData {
  userId: string
  profile: {
    user_id: string
    display_name?: string | null
  } | null
  permissions: Permissions
}

/**
 * Load all permissions for a user
 * Should be called once per session/request to build the permission context
 */
export async function loadUserPermissions(userId: string): Promise<UserAuthzData | null> {
  // Check demo session first
  const demoUser = getDemoSession()
  if (demoUser && demoUser.id === userId) {
    return buildDemoUserAuthz(userId, demoUser)
  }

  const supabase = createServerSupabaseClient()
  if (!supabase) return null

  try {
    // 1. Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .eq("user_id", userId)
      .maybeSingle()

    if (!profile) {
      console.warn("[v0] Profile not found for user:", userId)
      return null
    }

    // 2. Fetch org memberships
    const { data: orgMembershipsData } = await supabase
      .from("org_members")
      .select("org_id, role, created_at")
      .eq("user_id", userId)
    const orgMemberships = orgMembershipsData ?? []

    // 3. Fetch event staff roles (event_staff has no org_id — join through events if org context needed)
    let eventAccessByEventId: Record<string, string> = {}
    let eventOrgByEventId: Record<string, string> = {}
    if (orgMemberships.length > 0) {
      const orgIds = orgMemberships.map((m) => m.org_id)
      const { data: eventStaffData } = await supabase
        .from("event_staff")
        .select("event_id, role, events!inner(org_id)")
        .eq("user_id", userId)
        .in("events.org_id", orgIds)
      const eventStaff = eventStaffData ?? []

      eventAccessByEventId = eventStaff.reduce(
        (acc, staff) => {
          acc[staff.event_id] = staff.role
          return acc
        },
        {} as Record<string, string>
      )

      eventOrgByEventId = eventStaff.reduce(
        (acc, staff) => {
          const orgId = Array.isArray(staff.events)
            ? staff.events[0]?.org_id
            : (staff.events as any)?.org_id
          if (orgId) acc[staff.event_id] = orgId
          return acc
        },
        {} as Record<string, string>
      )
    }

    // 4. Check if global admin
    const { data: adminCheck } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    const isGlobalAdmin = !!adminCheck

    const activeOrgId = orgMemberships.length > 0 ? orgMemberships[0].org_id : null

    return {
      userId,
      profile,
      permissions: {
        isGlobalAdmin,
        orgMemberships: orgMemberships as OrgMembership[],
        eventAccessByEventId: eventAccessByEventId as Record<string, import("@/lib/rbac").EventRole>,
        eventOrgByEventId,
        activeOrgId,
      },
    }
  } catch (error) {
    console.error("[v0] Error loading user permissions:", error)
    return null
  }
}

/**
 * Build demo user authorization context
 */
function buildDemoUserAuthz(userId: string, demoUser: any): UserAuthzData {
  const isOrgAdmin = demoUser.role === "organizer" || demoUser.role === "admin"
  const isGlobalAdmin = demoUser.role === "admin"

  const orgMemberships: OrgMembership[] = isOrgAdmin
    ? [
        {
          org_id: demoUser.org_id || "demo-org-1",
          role: demoUser.role === "admin" ? "admin" : ("organizer" as const),
          created_at: new Date().toISOString(),
        },
      ]
    : []

  return {
    userId,
    profile: {
      user_id: demoUser.id,
      display_name: demoUser.full_name ?? demoUser.display_name ?? null,
    },
    permissions: {
      isGlobalAdmin,
      orgMemberships,
      eventAccessByEventId: isOrgAdmin
        ? {
            "demo-event-1": isGlobalAdmin ? ("admin" as const) : ("organizer" as const),
            "demo-event-2": isGlobalAdmin ? ("admin" as const) : ("organizer" as const),
          }
        : {},
      eventOrgByEventId: isOrgAdmin
        ? {
            "demo-event-1": demoUser.org_id || "demo-org-1",
            "demo-event-2": demoUser.org_id || "demo-org-1",
          }
        : {},
      activeOrgId: demoUser.org_id || "demo-org-1",
    },
  }
}

/**
 * Fetch org memberships for a user
 */
export async function getUserOrgMemberships(userId: string): Promise<OrgMembership[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("org_members")
      .select("org_id, role, created_at")
      .eq("user_id", userId)

    if (error) {
      console.error("[v0] Error fetching org memberships:", error)
      return []
    }

    return (data || []) as OrgMembership[]
  } catch (error) {
    console.error("[v0] Unexpected error fetching org memberships:", error)
    return []
  }
}

/**
 * Fetch event staff roles for a user in an org
 */
export async function getUserEventRoles(userId: string, orgId: string): Promise<EventStaff[]> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return []

  try {
    const { data, error } = await supabase
      .from("event_staff")
      .select("event_id, role, created_at, events!inner(org_id)")
      .eq("user_id", userId)
      .eq("events.org_id", orgId)

    if (error) {
      console.error("[v0] Error fetching event roles:", error)
      return []
    }

    return (data || []).map((row) => ({
      event_id: row.event_id,
      role: row.role,
      created_at: row.created_at ?? new Date().toISOString(),
      org_id: (Array.isArray(row.events) ? row.events[0]?.org_id : (row.events as any)?.org_id) ?? orgId,
    })) as EventStaff[]
  } catch (error) {
    console.error("[v0] Unexpected error fetching event roles:", error)
    return []
  }
}

/**
 * Check if user is global admin
 */
export async function isUserGlobalAdmin(userId: string): Promise<boolean> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return false

  try {
    const { data, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error checking admin status:", error)
      return false
    }

    return !!data
  } catch (error) {
    console.error("[v0] Unexpected error checking admin status:", error)
    return false
  }
}
