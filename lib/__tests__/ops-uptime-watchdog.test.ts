import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

// TICK-262 — the primary ops-alerts endpoint runs inside the Vercel app. If
// Vercel is the thing that is down, that endpoint cannot also be responsible for
// paging the human. The independent watchdog therefore lives in Supabase and
// sends outage/recovery transitions directly to the external ops webhook.

const migrationsDir = join(process.cwd(), "supabase/migrations")

function readWatchdogMigration(): string {
  const file = readdirSync(migrationsDir).find((name) =>
    name.endsWith("_independent_uptime_watchdog.sql")
  )
  expect(file, "independent uptime watchdog migration is missing").toBeDefined()
  return readFileSync(join(migrationsDir, file!), "utf8")
}

describe("independent uptime watchdog", () => {
  it("runs from pg_cron outside the Vercel failure domain", () => {
    const migration = readWatchdogMigration()

    expect(migration).toContain("'ticketiv-ops-uptime-watchdog'")
    expect(migration).toContain("'2-59/5 * * * *'")
    expect(migration).toContain("select public.fn_ops_uptime_watchdog(false);")
  })

  it("observes the actual pg_net result rather than queue success", () => {
    const migration = readWatchdogMigration()

    expect(migration).toContain("public.ops_cron_runs")
    expect(migration).toContain("net._http_response")
    expect(migration).toContain("r.job = 'ops-alerts'")
  })

  it("delivers directly from Supabase to a Vault-protected ops destination", () => {
    const migration = readWatchdogMigration()

    expect(migration).toContain("'ops_alert_delivery_url'")
    expect(migration).toContain("vault.decrypted_secrets")
    expect(migration).toContain("net.http_post(")
    expect(migration).toContain("'ops-uptime-alert-delivery'")
  })

  it("sends transition-only outage and recovery events", () => {
    const migration = readWatchdogMigration()

    expect(migration).toContain("state in ('unknown', 'healthy', 'degraded')")
    expect(migration).toContain("v_previous_state <> v_observed_state")
    expect(migration).toContain("'Ticketiv production is unreachable'")
    expect(migration).toContain("'Ticketiv production recovered'")
  })

  it("has a controlled delivery-test path without manufacturing production data", () => {
    const migration = readWatchdogMigration()

    expect(migration).toContain("p_force_test boolean default false")
    expect(migration).toContain("'[TEST] Ticketiv independent uptime alert'")
    expect(migration).toContain("'test', true")
  })

  it("is not callable from browser roles", () => {
    const migration = readWatchdogMigration()

    expect(migration).toMatch(
      /revoke execute on function public\.fn_ops_uptime_watchdog\(boolean\) from public, anon, authenticated/
    )
    expect(migration).toContain(
      "grant execute on function public.fn_ops_uptime_watchdog(boolean) to service_role"
    )
  })
})
