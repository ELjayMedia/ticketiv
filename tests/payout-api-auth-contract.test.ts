import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const route = readFileSync(join(process.cwd(), "app/api/payouts/route.ts"), "utf8")

describe("payout API authentication boundary", () => {
  it("validates the user before parsing or submitting a payout", () => {
    const authCheck = route.indexOf("supabase.auth.getUser()")
    const bodyParse = route.indexOf("request.json()")
    const payoutRpc = route.indexOf('supabase.rpc("fn_request_payout"')

    expect(authCheck).toBeGreaterThan(-1)
    expect(authCheck).toBeLessThan(bodyParse)
    expect(authCheck).toBeLessThan(payoutRpc)
    expect(route).not.toContain("supabase.auth.getSession()")
    expect(route).toContain('{ error: "Authentication required" }, { status: 401 }')
  })
})
