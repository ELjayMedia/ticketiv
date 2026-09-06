import { describe, expect, it } from "vitest"

import { migrationStatements, migrationStatementsMatching, migrationTable } from "./helpers/migration-contract"

// The canonical chain states the schema it produces, not the steps that got it
// there, so these read the shipped end state of public.pricing_plans.
const pricingPlans = migrationTable("public.pricing_plans")

const index = (name: string) => {
  const [statement] = migrationStatementsMatching(new RegExp(`^create (unique )?index ${name}\\b`))
  expect(statement, `${name} is not created by the canonical migration chain`).toBeDefined()
  return statement
}

describe("pricing-plan effective dating", () => {
  it("removes the legacy constraint that limited inactive plan history", () => {
    expect(
      pricingPlans,
      "pricing_plans_org_id_active_key is back — inactive plan history cannot be retained under it",
    ).not.toContain("pricing_plans_org_id_active_key")
  })

  it("allows only one active organization plan while retaining inactive history", () => {
    const idx = index("pricing_plans_one_active_per_org_idx")

    expect(idx).toContain("create unique index")
    expect(idx).toMatch(/\(\s*org_id\s*\)/)
    expect(idx).toMatch(/where[\s\S]*active is true[\s\S]*org_id is not null/)
  })

  it("allows only one active global plan despite null org ids", () => {
    const idx = index("pricing_plans_one_active_global_idx")

    expect(idx).toContain("create unique index")
    expect(idx).toMatch(/where[\s\S]*active is true[\s\S]*org_id is null/)
  })

  it("indexes effective-dated history without seeding commercial fee values", () => {
    expect(index("pricing_plans_effective_history_idx")).toMatch(/effective_from\s+desc/)

    const seeds = migrationStatements().filter((statement) =>
      /^(insert into|update)\s+public\.pricing_plans\b/.test(statement),
    )

    expect(seeds, "the chain seeds commercial fee values into pricing_plans").toEqual([])
  })
})
