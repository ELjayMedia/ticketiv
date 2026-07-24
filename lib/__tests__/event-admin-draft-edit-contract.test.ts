import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (path: string) => readFileSync(join(root, path), "utf8")

const EVENT_EDITOR_API_FILES = [
  "app/api/events/[eventId]/basics/route.ts",
  "app/api/events/[eventId]/schedule/route.ts",
  "app/api/events/[eventId]/venue/route.ts",
  "app/api/events/[eventId]/tickets/route.ts",
  "app/api/events/[eventId]/tickets/[ticketTypeId]/route.ts",
  "app/api/events/[eventId]/ticket-types/route.ts",
  "app/api/events/[eventId]/publish/route.ts",
  "app/api/events/[eventId]/ops/route.ts",
]

describe("event admin draft editing contract", () => {
  it("authorizes active event-level managers as well as workspace managers", () => {
    const helper = read("lib/api/event-management.ts")

    expect(helper).toContain('.from("event_staff")')
    expect(helper).toContain('.eq("active", true)')
    expect(helper).toContain("EVENT_MANAGER_ROLES.has")
    expect(helper).toContain("ORGANIZER_MANAGER_ROLES.has")
  })

  it("validates the authenticated user server-side", () => {
    const helper = read("lib/api/event-management.ts")

    expect(helper).toContain("supabase.auth.getUser()")
    expect(helper).not.toContain("supabase.auth.getSession()")
  })

  it.each(EVENT_EDITOR_API_FILES)("uses the shared event-manager guard: %s", (path) => {
    const source = read(path)

    expect(source).toContain("getAuthenticatedUserId")
    expect(source).toContain("loadEventManageContext")
    expect(source).not.toContain("const MANAGER_ROLES")
  })

  it("keeps page and API role definitions aligned", () => {
    const management = read("lib/org-management.ts")
    const helper = read("lib/api/event-management.ts")

    expect(management).toContain("export const EVENT_MANAGER_ROLES")
    expect(helper).toContain("EVENT_MANAGER_ROLES")
  })

  it("does not exclude draft events from management authorization", () => {
    const helper = read("lib/api/event-management.ts")

    expect(helper).not.toContain('.eq("status"')
    expect(helper).not.toContain('.neq("status"')
  })
})
