import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { mapPaystackSettlementMoney } from "@/lib/payments/paystack-settlements-core"

const root = process.cwd()

function readSettlementMigration() {
  const dir = join(root, "supabase/migrations")
  const file = readdirSync(dir).find((name) =>
    name.endsWith("_settlement_ingest_pg_cron_schedule.sql"),
  )
  expect(file, "settlement ingest pg_cron migration is missing").toBeDefined()
  return readFileSync(join(dir, file!), "utf8")
}

describe("Paystack settlement accounting", () => {
  it("maps Paystack's documented gross, fee and net fields", () => {
    const money = mapPaystackSettlementMoney({
      totalProcessed: 1_000,
      totalFees: 5,
      totalAmount: 995,
      effectiveAmount: 995,
    })

    expect(money).toEqual({
      grossCents: 1_000,
      feesCents: 5,
      netCents: 995,
    })
    expect(money.grossCents - money.feesCents).toBe(money.netCents)
  })

  it("derives gross from net plus fees when older responses omit total_processed", () => {
    expect(
      mapPaystackSettlementMoney({
        totalFees: 390,
        totalAmount: 9_610,
        effectiveAmount: 9_610,
      }),
    ).toEqual({
      grossCents: 10_000,
      feesCents: 390,
      netCents: 9_610,
    })
  })

  it("walks every transaction page before recording a settlement", () => {
    const source = readFileSync(
      join(root, "lib/payments/paystack-settlements.ts"),
      "utf8",
    )

    expect(source).toContain("fetchSettlementTransactions")
    expect(source).toContain("page=${page}")
    expect(source).toContain("if (batch.length < PER_PAGE) break")
    expect(source).toContain("exceeds the ${MAX_PAGES * PER_PAGE}-transaction ingest safety limit")
    expect(source).toContain("exceeds the ${MAX_PAGES * PER_PAGE}-batch ingest safety limit")
    expect(source).not.toContain(
      "a failure here must not lose the batch itself, so record the settlement with no items",
    )
  })
})

describe("settlement ingest scheduling", () => {
  it("runs daily from pg_cron and calls the secured endpoint", () => {
    const migration = readSettlementMigration()

    expect(migration).toContain("'ticketiv-settlement-ingest'")
    expect(migration).toContain("'20 4 * * *'")
    expect(migration).toContain("select public.fn_settlement_ingest_tick();")
    expect(migration).toContain("net.http_get(")
    expect(migration).toContain("'Authorization', 'Bearer ' || v_secret")
  })

  it("keeps configuration in Vault and each job resolves only its own response", () => {
    const migration = readSettlementMigration()

    expect(migration).toContain("'settlement_cron_url'")
    expect(migration).toContain("'ops_alert_cron_secret'")
    expect(migration).toContain("r.job = 'settlement-ingest'")
    expect(migration).toContain("r.job = 'ops-alerts'")
  })

  it("does not expose the tick function to browser roles", () => {
    const migration = readSettlementMigration()

    expect(migration).toMatch(
      /revoke execute on function public\.fn_settlement_ingest_tick\(\) from public, anon, authenticated/,
    )
    expect(migration).toContain(
      "grant execute on function public.fn_settlement_ingest_tick() to service_role",
    )
  })

  it("keeps GitHub Actions as manual fallback only", () => {
    const path = join(root, ".github/workflows/settlement-ingest.yml")
    expect(existsSync(path)).toBe(true)

    const workflow = readFileSync(path, "utf8")
    expect(workflow).toContain("workflow_dispatch:")
    expect(workflow).not.toMatch(/^\s*schedule:/m)
    expect(workflow).not.toMatch(/^\s*-\s*cron:/m)
  })
})
