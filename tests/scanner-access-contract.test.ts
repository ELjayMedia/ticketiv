import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("scanner access contract", () => {
  it("protects the event scanner with the dedicated scanner access guard", () => {
    const page = read("app/orgs/[orgId]/events/[eventId]/scanner/page.tsx")
    expect(page).toContain("requireEventScannerAccess")
    expect(page).not.toContain("getSession()")
  })

  it("permits active scanner and event staff roles without granting event management", () => {
    const management = read("lib/org-management.ts")
    expect(management).toContain('"scanner"')
    expect(management).toContain('"organizer_staff"')
    expect(management).toContain("EVENT_SCANNER_ROLES")
    expect(management).toContain("requireEventScannerAccess")
  })

  it("checks event ownership and preserves the scanner recovery destination", () => {
    const management = read("lib/org-management.ts")
    expect(management).toContain("event.org_id !== orgId")
    expect(management).toContain("/scanner")
    expect(management).toContain("encodeURIComponent")
  })
})
