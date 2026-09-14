import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260914121000_tick408_fix_uat_teardown_orders.sql",
)

function normalizedMigration(): string {
  return readFileSync(migrationPath, "utf8").replace(/\s+/g, " ").toLowerCase()
}

describe("TICK-408 UAT fixture teardown", () => {
  it("deletes every order belonging to either fixture organization", () => {
    const sql = normalizedMigration()

    expect(sql).toContain("delete from public.orders where org_id = any(v_orgs)")
    expect(sql).not.toMatch(/delete from public\.orders where id in\s*\(/)
  })

  it("deletes order children before organizations", () => {
    const sql = normalizedMigration()
    const orderItems = sql.indexOf("delete from public.order_items")
    const priceRuleRedemptions = sql.indexOf(
      "delete from public.price_rule_redemptions",
    )
    const orders = sql.indexOf("delete from public.orders where org_id = any(v_orgs)")
    const organizations = sql.indexOf("delete from public.organizations")

    expect(orderItems).toBeGreaterThan(-1)
    expect(priceRuleRedemptions).toBeGreaterThan(-1)
    expect(orders).toBeGreaterThan(orderItems)
    expect(orders).toBeGreaterThan(priceRuleRedemptions)
    expect(organizations).toBeGreaterThan(orders)
  })

  it("keeps teardown restricted to the deterministic fixture org IDs", () => {
    const sql = normalizedMigration()

    expect(sql).toContain("da7a0000-0000-4000-8000-000000000001")
    expect(sql).toContain("da7a0000-0000-4000-8000-000000000002")
    expect(sql).toContain("where id = any(v_orgs)")
  })
})
