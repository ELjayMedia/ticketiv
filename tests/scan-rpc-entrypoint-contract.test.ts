import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// TICK-334 regression guard — scan RPC entry point must match the caller's identity.
//
// public.fn_scan_ticket is the *claimed-account* shim: it runs
// app.require_claimed_account(), which requires auth.uid() from a real user JWT.
// A service-role client has no auth.uid(), so calling the shim from service-role
// raises `claimed_account_required` and the scan fails with a 500 — which is
// exactly what happened to /api/events/[eventId]/scan: every gate scan errored,
// and nothing in CI noticed, because no test asserted the scan lifecycle.
//
// Service-role callers must therefore use fn_scan_ticket_unchecked. That is not
// a loosening: the worker keeps its own caller guard (service_role permitted,
// otherwise p_scanned_by must equal auth.uid()) and still verifies the scanner
// is event staff. Callers holding a user JWT keep using the shim.
//
// These are static assertions on purpose — they run on every PR with no database
// credentials, so the pairing cannot silently regress while seeded E2E is still
// being stood up.

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

const SCAN_ROUTE = "app/api/events/[eventId]/scan/route.ts"
const SCANNING_LIB = "lib/scanning.ts"

describe("scan RPC entry point contract", () => {
  it("the service-role scan route calls the worker, not the claimed-account shim", () => {
    const route = read(SCAN_ROUTE)

    expect(route).toContain("createAdminClient()")
    expect(route).toContain('"fn_scan_ticket_unchecked"')
    // The shim would raise claimed_account_required for this service-role caller.
    expect(route).not.toContain('("fn_scan_ticket",')
  })

  it("the scan route still establishes the user before scanning on their behalf", () => {
    const route = read(SCAN_ROUTE)

    // Switching to the worker is only safe because the route authenticates and
    // passes that identity through as p_scanned_by for the staff check.
    expect(route).toContain("Authentication required")
    expect(route).toContain("p_scanned_by")
    expect(route).toContain("userId")
  })

  it("validateQrCode picks the entry point from the client it actually uses", () => {
    const lib = read(SCANNING_LIB)

    // Service-role (no user session) -> worker; user session -> shim.
    expect(lib).toContain("fn_scan_ticket_unchecked")
    expect(lib).toContain("fn_scan_ticket")
    expect(lib).toMatch(/asServiceRole[\s\S]{0,200}createAdminClient\(\)/)
    expect(lib).toMatch(/asServiceRole\s*\?\s*"fn_scan_ticket_unchecked"\s*:\s*"fn_scan_ticket"/)
  })

  it("never pairs a service-role client with the claimed-account shim anywhere", () => {
    for (const file of [SCAN_ROUTE, SCANNING_LIB]) {
      const source = read(file)
      // A literal `("fn_scan_ticket"` on a line that also builds an admin client
      // is the specific mistake this guard exists to prevent.
      const offending = source
        .split("\n")
        .filter((line) => line.includes('"fn_scan_ticket"') && line.includes("createAdminClient"))
      expect(offending, `${file} pairs the shim with a service-role client`).toEqual([])
    }
  })
})
