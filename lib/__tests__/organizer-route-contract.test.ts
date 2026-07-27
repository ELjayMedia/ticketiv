import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()
const at = (path: string) => join(root, path)

const ORGANIZER_ROUTE_FILES = [
  "app/orgs/[orgId]/dashboard/page.tsx",
  "app/orgs/[orgId]/events/page.tsx",
  "app/orgs/[orgId]/events/new/page.tsx",
  "app/orgs/[orgId]/events/[eventId]/page.tsx",
  "app/orgs/[orgId]/events/[eventId]/edit/page.tsx",
  "app/orgs/[orgId]/events/[eventId]/orders/page.tsx",
  "app/orgs/[orgId]/events/[eventId]/scanner/page.tsx",
  "app/orgs/[orgId]/finance/page.tsx",
  "app/orgs/[orgId]/settings/page.tsx",
]

describe("organizer route contract", () => {
  it.each(ORGANIZER_ROUTE_FILES)("keeps canonical route mounted: %s", (path) => {
    expect(existsSync(at(path))).toBe(true)
  })

  it("keeps the workspace dashboard free of the legacy generic organizer destination", () => {
    const source = readFileSync(at("app/orgs/[orgId]/dashboard/page.tsx"), "utf8")
    expect(source).not.toContain('href="/organizer"')
    expect(source).toContain(`/orgs/\${orgId}/events`)
    expect(source).toContain(`/orgs/\${orgId}/finance`)
    expect(source).toContain(`/orgs/\${orgId}/settings`)
  })

  it("exposes canonical event-management destinations", () => {
    const source = readFileSync(at("app/orgs/[orgId]/events/[eventId]/page.tsx"), "utf8")
    expect(source).toContain(`/orgs/\${orgId}/events/\${eventId}/edit?step=tickets`)
    expect(source).toContain(`/orgs/\${orgId}/events/\${eventId}/orders`)
    expect(source).toContain(`/orgs/\${orgId}/events/\${eventId}/scanner`)
    expect(source).toContain(`/orgs/\${orgId}/finance`)
    expect(source).toContain(`/orgs/\${orgId}/events/\${eventId}/edit?step=basics`)
  })

  it("protects destructive workspace settings from workspaces with events", () => {
    const page = readFileSync(at("app/orgs/[orgId]/settings/page.tsx"), "utf8")
    const panel = readFileSync(at("app/orgs/[orgId]/dashboard/delete-workspace-panel.tsx"), "utf8")
    expect(page).toContain('select("id", { count: "exact", head: true })')
    // The panel takes the count and refuses to offer deletion while it is
    // non-zero, routing the owner to the events list instead.
    expect(panel).toContain("eventCount")
    expect(panel).toContain("blockedByEvents")
    expect(panel).toContain("Manage events")
  })
})
