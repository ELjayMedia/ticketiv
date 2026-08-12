import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260812180000_pricing_plan_effective_dating.sql"),
  "utf8",
)

describe("pricing-plan effective dating", () => {
  it("removes the legacy constraint that limited inactive plan history", () => {
    expect(migration).toContain(
      "drop constraint if exists pricing_plans_org_id_active_key",
    )
  })

  it("allows only one active organization plan while retaining inactive history", () => {
    expect(migration).toContain("pricing_plans_one_active_per_org_idx")
    expect(migration).toContain("where active is true and org_id is not null")
  })

  it("allows only one active global plan despite null org ids", () => {
    expect(migration).toContain("pricing_plans_one_active_global_idx")
    expect(migration).toContain("where active is true and org_id is null")
  })

  it("indexes effective-dated history without seeding commercial fee values", () => {
    expect(migration).toContain("pricing_plans_effective_history_idx")
    expect(migration).toContain("effective_from desc")
    expect(migration).not.toMatch(/insert\s+into\s+public\.pricing_plans/i)
    expect(migration).not.toMatch(/update\s+public\.pricing_plans/i)
  })
})
