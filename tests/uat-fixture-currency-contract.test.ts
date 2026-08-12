import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260812033500_fix_uat_fixture_currency.sql"),
  "utf8",
)

describe("UAT lifecycle fixture currency", () => {
  it("pins the fixture to the Paystack launch currency instead of table defaults", () => {
    expect(migration).toContain("'currency', 'ZAR'")
    expect(migration).toContain("quota, currency) values")
    expect(migration).toContain("100, 'ZAR'")
    expect(migration).toContain("20, 'ZAR'")
    expect(migration).toContain("50, 'ZAR'")
    expect(migration).toContain("v_total, 'ZAR'")
    expect(migration).not.toContain("v_total, 'SZL'")
    expect(migration).not.toContain("10000, 'SZL'")
    expect(migration).not.toContain("20000, 'SZL'")
  })

  it("keeps the seed RPC service-role only", () => {
    expect(migration).toContain(
      "revoke execute on function public.fn_seed_uat_fixtures() from public, anon, authenticated;",
    )
    expect(migration).toContain(
      "grant execute on function public.fn_seed_uat_fixtures() to service_role;",
    )
  })
})
