// Server-side org-workspace role guards (TICK-277). Drives route protection from
// the same RBAC engine as the UI, so server denial matches UI gating. Reads the
// caller's specific org role via loadUserPermissions (org_members.role).

import "server-only"
import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { loadUserPermissions } from "@/lib/permissions-loader"
import {
  canManageOrg,
  canManageOrgStaff,
  canViewOrgPayouts,
  getOrgRole,
  type OrgRole,
  type Permissions,
} from "@/lib/rbac"

export type OrgCapability = "payouts" | "manage" | "staff"

const CHECK: Record<OrgCapability, (perms: Permissions, orgId: string) => boolean> = {
  payouts: canViewOrgPayouts,
  manage: canManageOrg,
  staff: canManageOrgStaff,
}

async function loadPerms(): Promise<Permissions | null> {
  const supabase = createServerSupabaseClient()
  if (!supabase) return null
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const res = await loadUserPermissions(user.id)
  return res?.permissions ?? null
}

/**
 * Redirect to the org dashboard if the current user's org role lacks `cap`.
 * Use at the top of a sensitive org page (after resolving orgId).
 */
export async function requireOrgCapability(orgId: string, cap: OrgCapability): Promise<void> {
  const perms = await loadPerms()
  if (!perms) redirect("/login")
  if (!CHECK[cap](perms, orgId)) redirect(`/orgs/${orgId}/dashboard`)
}

export interface OrgCapabilities {
  role: OrgRole | null
  payouts: boolean
  manage: boolean
  staff: boolean
}

/** Resolve the current user's role + capabilities for conditional nav. */
export async function getMyOrgCapabilities(orgId: string): Promise<OrgCapabilities> {
  const perms = await loadPerms()
  if (!perms) return { role: null, payouts: false, manage: false, staff: false }
  return {
    role: getOrgRole(perms, orgId),
    payouts: canViewOrgPayouts(perms, orgId),
    manage: canManageOrg(perms, orgId),
    staff: canManageOrgStaff(perms, orgId),
  }
}
