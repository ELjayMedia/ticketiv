import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { canViewFinance } from "@ticketiv/shared"
import { canViewOrgPayouts, type Permissions } from "@/lib/rbac"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261102100000_admin_finance_access.sql"),
  "utf8",
)

function member(role: string): Permissions {
  return {
    isGlobalAdmin: false,
    orgMemberships: [{ org_id: "o1", role: role as never }],
    eventAccessByEventId: {},
    eventOrgByEventId: {},
    activeOrgId: "o1",
  } as unknown as Permissions
}

describe("org admins can see finance and payouts", () => {
  it("the database finance-viewer checks admit organizer_admin", () => {
    const publicDef = migration.slice(migration.indexOf("public.is_org_finance_viewer"), migration.indexOf("app.is_org_finance_viewer"))
    const appDef = migration.slice(migration.indexOf("app.is_org_finance_viewer"))
    for (const def of [publicDef, appDef]) {
      expect(def).toContain("'organizer_admin'")
      expect(def).toContain("'finance'")
      expect(def).not.toContain("organizer_staff")
    }
  })

  it("the app agrees: admins and finance yes, door staff no", () => {
    for (const role of ["organizer_owner", "organizer_admin", "finance"]) {
      expect(canViewOrgPayouts(member(role), "o1"), role).toBe(true)
      expect(canViewFinance(role), role).toBe(true)
    }
    for (const role of ["organizer_staff", "scanner"]) {
      expect(canViewOrgPayouts(member(role), "o1"), role).toBe(false)
      expect(canViewFinance(role), role).toBe(false)
    }
  })
})
