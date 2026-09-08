import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { migrationCronJob, migrationFunction, migrationFunctionGrants } from "../../tests/helpers/migration-contract"

const root = process.cwd()
const WORKFLOWS_DIR = join(root, ".github/workflows")

function isAtMostDaily(schedule: string): boolean {
  const fields = schedule.trim().split(/\s+/)
  if (fields.length !== 5) return false
  const [minute, hour] = fields
  return /^\d+$/.test(minute) && /^\d+$/.test(hour)
}

const tick = () => migrationFunction("public.fn_ops_alerts_tick")

describe("ops alert scheduling", () => {
  it("schedules the alert endpoint every five minutes in pg_cron", () => {
    const job = migrationCronJob("ticketiv-ops-alerts")

    expect(job, "the ops-alert cron job is not scheduled by any migration").toBeDefined()
    expect(job!.schedule).toBe("*/5 * * * *")
    expect(job!.command).toBe("select public.fn_ops_alerts_tick();")
  })

  it("calls the secured endpoint with the same Bearer contract the route enforces", () => {
    const migration = tick()

    expect(migration).toContain("net.http_get(")
    expect(migration).toContain("'Authorization', 'Bearer ' || v_secret")
  })

  it("keeps the URL and secret in Vault so rotation is not a migration", () => {
    const migration = tick()

    expect(migration).toContain("vault.decrypted_secrets")
    expect(migration).toContain("'ops_alert_cron_url'")
    expect(migration).toContain("'ops_alert_cron_secret'")
  })

  it("does not leave the tick function callable from a browser session", () => {
    const grants = migrationFunctionGrants("public.fn_ops_alerts_tick")

    expect(grants.publicExecute, "public still holds the default execute grant").toBe(false)
    expect(grants.grantees).toEqual(["service_role"])
  })

  it("records each delivery, because pg_net success only means 'queued'", () => {
    const migration = tick()

    expect(migration).toContain("public.ops_cron_runs")
    expect(migration).toContain("net._http_response")
    expect(migration).toContain("r.job = 'ops-alerts'")
  })

  it("no longer pays GitHub Actions minutes for the alert cadence", () => {
    expect(existsSync(join(WORKFLOWS_DIR, "ops-alerts.yml"))).toBe(false)

    for (const name of readdirSync(WORKFLOWS_DIR)) {
      const workflow = readFileSync(join(WORKFLOWS_DIR, name), "utf8")
      for (const [, schedule] of workflow.matchAll(/^\s*-\s*cron:\s*"([^"]+)"/gm)) {
        expect(
          isAtMostDaily(schedule),
          `${name} schedules "${schedule}" — sub-daily Actions crons blow the 2,000-minute allowance`
        ).toBe(true)
      }
    }
  })

  it("does not ask Vercel for a cron cadence the Hobby plan cannot run", () => {
    const config = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8")) as {
      crons?: { path: string; schedule: string }[]
    }

    for (const cron of config.crons ?? []) {
      expect(
        isAtMostDaily(cron.schedule),
        `vercel.json cron ${cron.path} uses "${cron.schedule}" — sub-daily crons fail the production deployment on Hobby`
      ).toBe(true)
    }
  })
})
