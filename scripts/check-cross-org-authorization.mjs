// TICK-337 — run the cross-org authorization harness.
//
// supabase/tests/cross_org_authorization.sql builds two tenants and their own
// users inside a transaction, impersonates them, attempts every high-risk
// cross-tenant action, and rolls the whole thing back by raising at the end.
// Because it seeds itself, it needs no fixture project and no pre-created
// personas — only a service-role connection.
//
// Usage:
//   node scripts/check-cross-org-authorization.mjs
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Without
// them the check SKIPS rather than fails, matching check-rpc-permissions.mjs:
// CI does not always hold database credentials, and a check that cannot run
// must not be mistaken for a check that passed.
//
// Exit codes:
//   0  every case refused (or skipped for missing credentials)
//   1  a cross-tenant action succeeded, or a positive control failed

import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const SQL_PATH = resolve(here, "../supabase/tests/cross_org_authorization.sql")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.log(
    "Cross-org authorization check skipped: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.",
  )
  process.exit(0)
}

const sql = readFileSync(SQL_PATH, "utf8")

// The harness signals completion by raising, so a "successful" run arrives as
// a Postgres error whose message carries the report. That is deliberate: it is
// what guarantees the transaction rolls back and leaves nothing behind.
const response = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
  method: "POST",
  headers: {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query: sql }),
})

const raw = await response.text()
const report = extractReport(raw)

if (!report) {
  console.error("Could not read a report from the harness. Raw response:")
  console.error(raw.slice(0, 4000))
  console.error(
    "\nIf this says exec_sql does not exist, the project has no SQL-execution RPC exposed; " +
      "run supabase/tests/cross_org_authorization.sql through the SQL editor or psql instead.",
  )
  process.exit(1)
}

console.log(report)

const failed = Number(/failed=(\d+)/.exec(report)?.[1] ?? "0")
const review = Number(/needs-review=(\d+)/.exec(report)?.[1] ?? "0")

if (failed > 0) {
  console.error(`\n${failed} cross-tenant action(s) succeeded, or a positive control failed.`)
  process.exit(1)
}

if (review > 0) {
  // Not a failure, but never let it pass silently: a call refused for a reason
  // that is not an authorization decision has not been proven safe. This is
  // exactly how the app_role = text bug in fn_transition_event_status and
  // fn_duplicate_event was found.
  console.warn(
    `\n${review} case(s) were refused for a non-authorization reason and need reading. ` +
      "A function that errors before reaching its authorization check is not proven safe.",
  )
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
