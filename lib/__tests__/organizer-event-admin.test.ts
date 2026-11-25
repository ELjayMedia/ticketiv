import { describe, expect, it } from "vitest"

import { resolveOrganizerAccess } from "@/lib/organizer/resolve"

// An event admin assigned from the command centre is an event_staff
// organizer_admin. They may also be door staff of the organisation; that must
// not hide the event they run.

const EVENT = "11111111-1111-4111-8111-111111111111"
const OTHER = "22222222-2222-4222-8222-222222222222"

describe("resolveOrganizerAccess · event admins", () => {
  it("lets someone with no org role manage only their event", () => {
    const a = resolveOrganizerAccess({ storedRole: null, assignments: [{ event_id: EVENT, role: "organizer_admin" }], isPlatformAdmin: false })
    expect(a?.managedEventIds).toEqual([EVENT])
    expect(a?.eventIds).toEqual([EVENT])
    expect(a?.role).toBe("staff")
  })

  it("keeps the event admin's event for an org door-staff member", () => {
    const a = resolveOrganizerAccess({
      storedRole: "organizer_staff",
      assignments: [{ event_id: EVENT, role: "organizer_admin" }],
      isPlatformAdmin: false,
    })
    expect(a?.managedEventIds).toEqual([EVENT])
    expect(a?.managedEventIds).not.toContain(OTHER)
  })

  it("org managers manage everything without a list", () => {
    const a = resolveOrganizerAccess({ storedRole: "organizer_admin", assignments: [{ event_id: EVENT, role: "organizer_admin" }], isPlatformAdmin: false })
    expect(a?.managedEventIds).toEqual([])
    expect(a?.role).toBe("manager")
  })
})
