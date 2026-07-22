import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("scanner access contract", () => {
  it("protects the organizer scanner entry with the dedicated scanner access guard", () => {
    const page = read("app/orgs/[orgId]/events/[eventId]/scanner/page.tsx")
    expect(page).toContain("requireEventScannerAccess")
    expect(page).not.toContain("getSession()")
  })

  it("routes organizer and staff entry into the canonical scanner setup journey", () => {
    const page = read("app/orgs/[orgId]/events/[eventId]/scanner/page.tsx")
    expect(page).toContain("/scan/setup")
    expect(page).toContain("eventId")
    expect(page).toContain("orgId")
    expect(page).toContain("returnTo")
    expect(page).not.toContain("ScannerClient")
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

  it("keeps device sessions, offline queueing and duplicate outcomes in the canonical scanner", () => {
    const scanner = read("app/(scanner)/scan/page.tsx")
    expect(scanner).toContain("loadDeviceSession")
    expect(scanner).toContain("ticketiv_offline_scans")
    expect(scanner).toContain("evaluateScannerOfflineManifest")
    expect(scanner).toContain("previousScan")
    expect(scanner).toContain("End session")
  })
})
