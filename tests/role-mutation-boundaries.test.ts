import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { canPlatformAdminMutate } from "@/lib/super-admin/permissions"

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

describe("role mutation boundaries", () => {
  it("keeps read-only platform admins out of every admin mutation tier", () => {
    expect(canPlatformAdminMutate("super_admin")).toBe(true)
    expect(canPlatformAdminMutate("finance_admin")).toBe(true)
    expect(canPlatformAdminMutate("support_admin")).toBe(true)
    expect(canPlatformAdminMutate("event_ops_admin")).toBe(true)
    expect(canPlatformAdminMutate("read_only_admin")).toBe(false)
    expect(canPlatformAdminMutate("unknown")).toBe(false)

    const webhooks = source("app/super-admin/webhooks/actions.ts")
    expect(webhooks).toContain("ADMIN_MUTATION_ROLE_TIERS")
    expect(webhooks).not.toContain("requireAdminRole(ADMIN_ROLE_TIERS)")
  })

  it("uses mutation-aware organizer guards on direct server actions", () => {
    const guardedActions = [
      ["app/orgs/[orgId]/events/actions.ts", "requireEventManager"],
      ["app/orgs/[orgId]/series/actions.ts", "requireOrgManager"],
      ["app/orgs/[orgId]/team/invite/actions.ts", "requireOrgManager"],
      ["app/orgs/[orgId]/payouts/accounts/actions.ts", "requireOrgManager"],
      ["app/orgs/[orgId]/profile/actions.ts", "requireOrgOwner"],
      ["app/orgs/[orgId]/dashboard/delete-workspace-action.ts", "requireOrgOwner"],
    ] as const

    for (const [path, guard] of guardedActions) {
      expect(source(path), path).toContain(`${guard}(`)
    }
  })

  it("does not grant event API writes to every active platform admin", () => {
    const mutatingRoutes = [
      "app/api/uploads/route.ts",
      "app/api/events/[eventId]/basics/route.ts",
      "app/api/events/[eventId]/dates/route.ts",
      "app/api/events/[eventId]/guestlist/route.ts",
      "app/api/events/[eventId]/lineup/[artistId]/route.ts",
      "app/api/events/[eventId]/lineup/route.ts",
      "app/api/events/[eventId]/policies/route.ts",
      "app/api/events/[eventId]/publish/route.ts",
      "app/api/events/[eventId]/schedule/route.ts",
      "app/api/events/[eventId]/staff/[userId]/route.ts",
      "app/api/events/[eventId]/staff/route.ts",
      "app/api/events/[eventId]/tickets/[ticketTypeId]/route.ts",
      "app/api/events/[eventId]/tickets/route.ts",
      "app/api/events/[eventId]/venue/route.ts",
    ]

    for (const path of mutatingRoutes) {
      const route = source(path)
      expect(route, path).toContain('select("role_tier")')
      expect(route, path).toContain('"read_only_admin"')
    }
  })

  it("enforces the same boundary in RLS and attendee-owned writes", () => {
    const migration = source("supabase/migrations/20261113100000_role_mutation_boundaries.sql")
    expect(migration).toContain("au.role_tier <> 'read_only_admin'")
    expect(migration).toContain("or app.can_platform_mutate()")
    expect(migration).toContain("to anon, authenticated")
    expect(migration).toContain("user_id = app.uid()")
    expect(migration).toContain("tt.event_id = waitlists.event_id")
    expect(migration).toContain("notification_mutes_type_format")

    const waitlist = source("app/(consumer)/waitlist/actions.ts")
    expect(waitlist).toContain("cleanEmail(user?.email ?? null) ?? emailFromForm")
  })
})

