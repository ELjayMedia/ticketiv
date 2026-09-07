import { describe, expect, it } from "vitest"

import { migrationFunction, migrationFunctionGrants } from "./helpers/migration-contract"

const migration = migrationFunction("public.fn_seed_uat_fixtures")

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
    const grants = migrationFunctionGrants("public.fn_seed_uat_fixtures")

    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(grants.grantees).toEqual(["service_role"])
  })
})
