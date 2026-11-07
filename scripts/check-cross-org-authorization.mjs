// TICK-337 — run the cross-org authorization harness.
//
// supabase/tests/cross_org_authorization.sql builds two tenants and their own
// users inside a transaction, impersonates them, attempts every high-risk
// cross-tenant action, and rolls the whole thing back by raising at the end.
// Because it seeds itself, it needs no fixture project and no pre-created
// personas — only a privileged Supabase backend connection.
//
// Usage:
//   node scripts/check-cross-org-authorization.mjs
//
// Requires TICKETIV_CROSS_ORG_TEST_DB_URL: a privileged Postgres connection
// string for an isolated verification database with Ticketiv's schema. The
// production PostgREST API intentionally exposes no exec_sql RPC, so a
// service-role API key cannot execute this harness. Do not point this at the
// live database, even though the harness rolls back its test data.
// CI must provision a non-production verification environment.
//
// Exit codes:
//   0  every case refused
//   1  cross-tenant authorization assertion failed
//   2  harness could not run (credentials or SQL execution capability missing)

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const SQL_PATH = resolve(here, "../supabase/tests/cross_org_authorization.sql")

const testDatabaseUrl = process.env.TICKETIV_CROSS_ORG_TEST_DB_URL

if (!testDatabaseUrl || !existsSync(SQL_PATH)) {
  console.error(
    "Cross-org authorization check BLOCKED: TICKETIV_CROSS_ORG_TEST_DB_URL or SQL harness is missing. Provide an isolated test database.",
  )
  process.exit(2)
}

// The harness deliberately raises an exception containing its results so the
// transaction is rolled back. ON_ERROR_STOP makes psql nonzero as expected;
// parse the report, not the process exit code, to determine authorization.
// libpq does not expand a connection URI held in PGDATABASE, so split it into
// the standard PG* variables; that also keeps the password out of argv.
let connectionEnv
try {
  connectionEnv = libpqEnvFromUrl(testDatabaseUrl)
} catch (error) {
  console.error("Cross-org authorization check BLOCKED: TICKETIV_CROSS_ORG_TEST_DB_URL is not a valid postgres URL:", error.message)
  process.exit(2)
}
const execution = spawnSync("psql", ["-X", "-v", "ON_ERROR_STOP=1", "-f", SQL_PATH], {
  encoding: "utf8",
  env: { ...process.env, ...connectionEnv },
  timeout: 120_000,
  maxBuffer: 10 * 1024 * 1024,
})
if (execution.error || execution.signal) {
  console.error("Cross-org authorization check BLOCKED: psql could not complete:", execution.error?.message ?? execution.signal)
  process.exit(2)
}
const raw = `${execution.stdout ?? ""}\n${execution.stderr ?? ""}`

const report = extractReport(raw)

if (!report) {
  console.error("Could not read a report from the harness. Raw response:")
  console.error(raw.slice(0, 4000))
  console.error(
    "\nThe harness did not complete its transaction: check the isolated database schema and psql permissions.",
  )
  process.exit(2)
}

console.log(report)

const failed = Number(/failed=(\d+)/.exec(report)?.[1] ?? "0")
const review = Number(/needs-review=(\d+)/.exec(report)?.[1] ?? "0")

if (failed > 0) {
  console.error(`\n${failed} cross-tenant action(s) succeeded, or a positive control failed.`)
  process.exit(1)
}

if (review > 0) {
  console.error(
    `\n${review} case(s) were refused for a non-authorization reason and need reading. ` +
      "A function that errors before reaching its authorization check is not proven safe.",
  )
  process.exit(1)
}

console.log("\nNo cross-tenant action succeeded.")

function extractReport(body) {
  const marker = "CROSS-ORG AUTHORIZATION"
  try {
    const parsed = JSON.parse(body)
    for (const value of Object.values(parsed ?? {})) {
      if (typeof value === "string" && value.includes(marker)) return value
    }
  } catch {
    // Not JSON; fall through to the raw scan below.
  }
  return body.includes(marker) ? body : null
}

function libpqEnvFromUrl(value) {
  const url = new URL(value)
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`unsupported protocol ${url.protocol}`)
  }
  const env = {}
  if (url.hostname) env.PGHOST = decodeURIComponent(url.hostname)
  if (url.port) env.PGPORT = url.port
  if (url.username) env.PGUSER = decodeURIComponent(url.username)
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password)
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  if (database) env.PGDATABASE = database
  const sslmode = url.searchParams.get("sslmode")
  if (sslmode) env.PGSSLMODE = sslmode
  return env
}
