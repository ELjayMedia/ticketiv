import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { canManageEvent, canScanEvent, type Permissions } from "@/lib/rbac"
import { canOpenSection, organizerRoleFrom } from "@ticketiv/shared"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20261102090000_organizer_staff_door_role.sql"),
  "utf8",
)

function permsWithEventRole(role: string): Permissions {
  return {
    isGlobalAdmin: false,
    orgMemberships: [],
    eventAccessByEventId: { e1: role as never },
    eventOrgByEventId: { e1: "o1" },
    activeOrgId: "o1",
  }
}

describe("organizer_staff is door staff (ADR 0002)", () => {
  it("the database narrows managers to owner/admin and keeps door paths on is_org_operator", () => {
    const managerDef = migration.slice(
      migration.lastIndexOf("create or replace function app.is_org_manager"),
      migration.indexOf("comment on function app.is_org_manager"),
    )
    expect(managerDef).toContain("array['organizer_owner','organizer_admin']")
    expect(managerDef).not.toContain("organizer_staff")

    const operatorDef = migration.slice(
      migration.indexOf("create or replace function app.is_org_operator"),
      migration.indexOf("comment on function app.is_org_operator"),
    )
    expect(operatorDef).toContain("'organizer_staff'")
    expect(migration).toContain("revoke all on function app.is_org_operator(uuid) from public")
    // Box office, device sessions and guestlist stay available to door staff.
    for (const fn of ["public.fn_close_pos_shift", "public.fn_start_device_session", "app.can_manage_guestlist_entry"]) {
      expect(migration).toContain(`'${fn}'`)
    }
  })

  it("the app agrees: door staff can scan but cannot manage events", () => {
    const staff = permsWithEventRole("organizer_staff")
    expect(canScanEvent(staff, "e1")).toBe(true)
    expect(canManageEvent(staff, "e1")).toBe(false)

    const admin = permsWithEventRole("organizer_admin")
    expect(canManageEvent(admin, "e1")).toBe(true)
  })

  it("the shared role model matches", () => {
    expect(organizerRoleFrom("organizer_staff")).toBe("staff")
    expect(canOpenSection("staff", "boxOffice")).toBe(true)
    expect(canOpenSection("staff", "settings")).toBe(false)
  })
})
