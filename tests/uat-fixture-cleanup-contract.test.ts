import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const cleanupSql = fs.readFileSync(path.join(process.cwd(), "scripts/cleanup-uat-fixtures.sql"), "utf8")

describe("UAT fixture cleanup routine", () => {
  it("requires an explicit lowercase run marker", () => {
    expect(cleanupSql).toContain("ticketiv.uat_run_id")
    expect(cleanupSql).toContain("^uat-[a-z0-9][a-z0-9-]{2,80}$")
    expect(cleanupSql).not.toContain("like 'uat%'")
  })

  it("is dry-run by default and only deletes behind the apply flag", () => {
    expect(cleanupSql).toContain("'false'))")
    expect(cleanupSql).toContain("apply_cleanup")
    expect(cleanupSql.match(/WHERE \(SELECT apply_cleanup FROM _uat_cleanup_config\)/g)?.length ?? 0).toBeGreaterThan(
      20,
    )
  })

  it("keeps money-path cleanup behind a separate evidence gate", () => {
    expect(cleanupSql).toContain("ticketiv.uat_allow_money_delete")
    expect(cleanupSql).toContain("Refusing to delete % money-path rows")
    expect(cleanupSql).toContain("Set ticketiv.uat_allow_money_delete=true only after UAT evidence is recorded")
  })

  it("does not delete auth identities", () => {
    expect(cleanupSql).toContain("This script does not delete auth.users or profiles")
    expect(cleanupSql).not.toMatch(/DELETE FROM auth\./i)
    expect(cleanupSql).not.toMatch(/DELETE FROM public\.profiles/i)
  })
})
