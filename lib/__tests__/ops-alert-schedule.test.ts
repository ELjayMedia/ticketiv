import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// TICK-262 / ops cost — where the ops-alerts stopwatch lives.
//
// The endpoint runs every 5 minutes. Two of the three places that could hold
// that schedule are wrong, and both are easy to reintroduce by accident:
//
//   GitHub Actions — bills per *started* minute, so ~8,640 runs/month burned
//   ~8,640 minutes against a 2,000-minute private-repo allowance. This is where
//   the schedule used to live.
//
//   Vercel Cron — the account is on the Hobby plan, which triggers cron jobs at
//   most once per day. A 5-minute cadence is not expressible there, and a
//   vercel.json that asks for one fails the production deployment.
//
// It now lives in pg_cron, next to the */5 job the database already runs. These
// tests pin that down from both ends: the schedule exists in the migration, and
// neither of the expensive/broken homes has quietly regained a sub-daily cron.

const root = process.cwd()
const MIGRATIONS_DIR = join(root, "supabase/migrations")
const WORKFLOWS_DIR = join(root, ".github/workflows")

// A cron expression runs at most once a day only when both the minute and hour
// fields are single fixed values. "0 4 * * *" qualifies; "*/5 * * * *" and
// "0 * * * *" do not.
function isAtMostDaily(schedule: string): boolean {
  const fields = schedule.trim().split(/\s+/)
  if (fields.length !== 5) return false
  const [minute, hour] = fields
  return /^\d+$/.test(minute) && /^\d+$/.test(hour)
}

function readMigration(): string {
  const file = readdirSync(MIGRATIONS_DIR).find((name) =>
    name.endsWith("_ops_alerts_pg_cron_schedule.sql")
  )
  expect(file, "ops alerts pg_cron migration is missing").toBeDefined()
  return readFileSync(join(MIGRATIONS_DIR, file!), "utf8")
}

describe("ops alert scheduling", () => {
  it("schedules the alert endpoint every five minutes in pg_cron", () => {
    const migration = readMigration()

    expect(migration).toContain("cron.schedule(")
    expect(migration).toContain("'ticketiv-ops-alerts'")
    expect(migration).toContain("'*/5 * * * *'")
    expect(migration).toContain("select public.fn_ops_alerts_tick();")
  })

  it("calls the secured endpoint with the same Bearer contract the route enforces", () => {
    const migration = readMigration()

    expect(migration).toContain("net.http_get(")
    expect(migration).toContain("'Authorization', 'Bearer ' || v_secret")
  })

  it("keeps the URL and secret in Vault so rotation is not a migration", () => {
    const migration = readMigration()

    expect(migration).toContain("vault.decrypted_secrets")
    expect(migration).toContain("'ops_alert_cron_url'")
    expect(migration).toContain("'ops_alert_cron_secret'")
  })

  it("does not leave the tick function callable from a browser session", () => {
    const migration = readMigration()

    // Supabase grants EXECUTE to anon/authenticated on creation, so revoking
    // from PUBLIC alone is not enough.
    expect(migration).toMatch(
      /revoke execute on function public\.fn_ops_alerts_tick\(\) from public, anon, authenticated/
    )
    expect(migration).toContain("grant execute on function public.fn_ops_alerts_tick() to service_role")
  })

  it("records each delivery, because pg_net success only means 'queued'", () => {
    const migration = readMigration()

    // net.http_get returns once the request is queued, so cron.job_run_details
    // reports success even when the endpoint is down. The run log is the only
    // thing that can tell those apart after net._http_response is pruned.
    expect(migration).toContain("public.ops_cron_runs")
    expect(migration).toContain("net._http_response")
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
