// Server-side permissions loader
// Fetches org_members, event_staff, and admin_users for current user

import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { OrgMembership, EventStaff, Permissions } from "@/lib/rbac"
import { getDemoSession } from "@/lib/demo-auth"

export interface UserAuthzData {
  userId: string
  profile: {
    id: string
    email: string
    display_name?: string | null
    default_org_id?: string | null
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
      .select("id, email, display_name, org_id")
      .eq("id", userId)
      .maybeSingle()

    if (!profile) {
      console.warn("[v0] Profile not found for user:", userId)
      return null
    }

    // 2. Fetch org memberships
    const { data: orgMemberships = [] } = await supabase
      .from("org_members")
      .select("org_id, role, created_at")
      .eq("user_id", userId)

    // 3. Fetch event staff roles (only when user has org memberships to avoid loading everything)
    let eventAccessByEventId: Record<string, string> = {}
    if (orgMemberships.length > 0) {
      const orgIds = orgMemberships.map((m) => m.org_id)
      const { data: eventStaff = [] } = await supabase
        .from("event_staff")
        .select("event_id, role")
        .eq("user_id", userId)
        .in("org_id", orgIds)

      eventAccessByEventId = eventStaff.reduce(
        (acc, staff) => {
          acc[staff.event_id] = staff.role
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

    // Determine active org: use first membership, or profile's default org
    const activeOrgId =
      orgMemberships.length > 0
        ? orgMemberships[0].org_id
        : profile.org_id
        ? profile.org_id
        : null

    return {
      userId,
      profile,
      permissions: {
        isGlobalAdmin,
        orgMemberships: orgMemberships as OrgMembership[],
        eventAccessByEventId,
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
      id: demoUser.id,
      email: demoUser.email,
      display_name: demoUser.full_name,
      default_org_id: demoUser.org_id,
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
      .select("event_id, org_id, role, created_at")
      .eq("user_id", userId)
      .eq("org_id", orgId)

    if (error) {
      console.error("[v0] Error fetching event roles:", error)
      return []
    }

    return (data || []) as EventStaff[]
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
