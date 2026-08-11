#!/usr/bin/env node
// TICK-337 — guard the privileged RPC surface against drift.
//
// Two layers, because CI does not always hold database credentials:
//
//   1. Invariants over the committed snapshot. These always run, so a PR that
//      widens a grant in supabase/permissions/rpc-grants.json fails review even
//      with no secrets configured.
//   2. A live diff against fn_export_rpc_permissions(), which runs whenever
//      NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are present. This is
//      what catches a grant applied straight to the database without a
//      migration.
//
// Small migrations may record their new functions in rpc-grants.additions.json
// so the permission change stays reviewable without replacing the large base
// snapshot. `--write` folds all live functions back into the base snapshot and
// clears the additions file.
//
// Regenerate the snapshot deliberately, and only alongside the migration that
// changed the surface:
//   node scripts/check-rpc-permissions.mjs --write

import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const SNAPSHOT_PATH = resolve(here, "../supabase/permissions/rpc-grants.json")
const SNAPSHOT_ADDITIONS_PATH = resolve(here, "../supabase/permissions/rpc-grants.additions.json")

const BROWSER_ROLES = ["PUBLIC", "anon", "authenticated"]

/**
 * SECURITY DEFINER functions in `public` that anonymous buyers are allowed to
 * reach. `public` is the schema PostgREST publishes, so anything here is on the
 * open internet. Every entry needs a reason, and adding one is a security
 * review, not a formality.
 */
const ANON_ALLOWLIST = new Map([
  [
    "fn_apply_pricing_to_order",
    "Reprice-trigger helper. The grant has to stay because the three reprice triggers are SECURITY INVOKER and run as the buyer; a direct call is refused at runtime via pg_trigger_depth() = 0. See 20260725140000.",
  ],
  ["fn_preview_promo_code", "Guest checkout previews a promo code before signing in. STABLE, writes nothing, scoped to published events."],
  ["fn_ticket_type_remaining", "Public event pages show remaining counts to signed-out visitors. STABLE, writes nothing."],
  [
    "get_public_profile",
    "Public profile pages (/u/{handle}) resolve a handle for signed-out visitors. STABLE, writes nothing, search_path pinned to ''. Returns only handle, display name, avatar and join date — the fields the page already shows publicly — for an exact handle match behind a ^[A-Za-z0-9_]{3,30}$ guard, so it cannot be used to enumerate users or reach any other profile column.",
  ],
])

/**
 * Functions that must never be callable from a browser session, whatever role
 * it carries. An anonymous guest session holds the `authenticated` database
 * role, so "authenticated" is not a trust boundary on its own.
 */
const NEVER_CLIENT_CALLABLE = [
  "fn_complete_resale_after_payment",
  "fn_complete_waitlist_after_payment",
  "fn_complete_resale_after_payment_webhook",
  "fn_complete_waitlist_after_payment_webhook",
  "fn_export_rpc_permissions",
]

function readSnapshotFunctions(path) {
  if (!existsSync(path)) return []
  const parsed = JSON.parse(readFileSync(path, "utf8"))
  return Array.isArray(parsed.functions) ? parsed.functions : []
}

function loadSnapshot() {
  const merged = normalise([
    ...readSnapshotFunctions(SNAPSHOT_PATH),
    ...readSnapshotFunctions(SNAPSHOT_ADDITIONS_PATH),
  ])
  const byKey = new Map(merged.map((fn) => [`${fn.schema}.${fn.name}(${fn.arguments})`, fn]))
  return [...byKey.values()]
}

function normalise(rows) {
  return rows
    .map((r) => ({
      schema: r.schema ?? r.schema_name,
      name: r.name ?? r.function_name,
      arguments: r.arguments ?? "",
      securityDefiner: Boolean(r.securityDefiner ?? r.security_definer),
      searchPathPinned: Boolean(r.searchPathPinned ?? r.search_path_pinned),
      grantees: [...(r.grantees ?? [])].sort(),
    }))
    .sort((a, b) => `${a.schema}.${a.name}(${a.arguments})`.localeCompare(`${b.schema}.${b.name}(${b.arguments})`))
}

const key = (f) => `${f.schema}.${f.name}(${f.arguments})`
const reachableFromBrowser = (f) => f.grantees.some((g) => BROWSER_ROLES.includes(g))

function checkInvariants(functions) {
  const failures = []

  for (const fn of functions) {
    if (fn.securityDefiner && !fn.searchPathPinned) {
      failures.push(`${key(fn)} is SECURITY DEFINER with no pinned search_path`)
    }

    if (NEVER_CLIENT_CALLABLE.includes(fn.name) && reachableFromBrowser(fn)) {
      const roles = fn.grantees.filter((g) => BROWSER_ROLES.includes(g)).join(", ")
      failures.push(`${key(fn)} must never be client-callable, but grants EXECUTE to ${roles}`)
    }

    const anonReachable = fn.grantees.some((g) => g === "PUBLIC" || g === "anon")
    if (fn.schema === "public" && fn.securityDefiner && anonReachable && !ANON_ALLOWLIST.has(fn.name)) {
      failures.push(
        `${key(fn)} is a SECURITY DEFINER function reachable by anonymous callers and is not on the reviewed allowlist. ` +
          `Either revoke the grant, or add it to ANON_ALLOWLIST in this script with a written justification.`,
      )
    }
  }

  return failures
}

async function fetchLive() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) return null

  const { createClient } = await import("@supabase/supabase-js")
  const client = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await client.rpc("fn_export_rpc_permissions")
  if (error) throw new Error(`fn_export_rpc_permissions failed: ${error.message}`)
  return normalise(data ?? [])
}

function diff(snapshot, live) {
  const snapByKey = new Map(snapshot.map((f) => [key(f), f]))
  const liveByKey = new Map(live.map((f) => [key(f), f]))
  const drift = []

  for (const [k, fn] of liveByKey) {
    const known = snapByKey.get(k)
    if (!known) {
      drift.push(`+ ${k} exists in the database but not in the snapshot (grants: ${fn.grantees.join(", ") || "none"})`)
      continue
    }
    if (known.grantees.join(",") !== fn.grantees.join(",")) {
      drift.push(`~ ${k} grants changed: snapshot [${known.grantees.join(", ")}] -> live [${fn.grantees.join(", ")}]`)
    }
    if (known.securityDefiner !== fn.securityDefiner) {
      drift.push(`~ ${k} security mode changed: snapshot definer=${known.securityDefiner} -> live definer=${fn.securityDefiner}`)
    }
    if (known.searchPathPinned !== fn.searchPathPinned) {
      drift.push(`~ ${k} search_path pinning changed: snapshot ${known.searchPathPinned} -> live ${fn.searchPathPinned}`)
    }
  }

  for (const k of snapByKey.keys()) {
    if (!liveByKey.has(k)) drift.push(`- ${k} is in the snapshot but no longer exists in the database`)
  }

  return drift
}

async function main() {
  const write = process.argv.includes("--write")

  if (write) {
    const live = await fetchLive()
    if (!live) {
      console.error("--write needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
      process.exit(1)
    }
    writeFileSync(SNAPSHOT_PATH, `${JSON.stringify({ functions: live }, null, 2)}\n`)
    if (existsSync(SNAPSHOT_ADDITIONS_PATH)) {
      writeFileSync(SNAPSHOT_ADDITIONS_PATH, `${JSON.stringify({ functions: [] }, null, 2)}\n`)
    }
    console.log(`Wrote ${live.length} functions to supabase/permissions/rpc-grants.json`)
    const failures = checkInvariants(live)
    if (failures.length) {
      console.error("\nThe regenerated snapshot violates the permission invariants:")
      for (const f of failures) console.error(`  - ${f}`)
      process.exit(1)
    }
    return
  }

  const snapshot = loadSnapshot()
  const failures = checkInvariants(snapshot)

  if (failures.length) {
    console.error("Permission matrix invariants failed:")
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log(`Permission matrix invariants passed (${snapshot.length} functions).`)

  const live = await fetchLive()
  if (!live) {
    console.log("Live drift check skipped: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set.")
    return
  }

  const drift = diff(snapshot, live)
  if (drift.length) {
    console.error("\nLive RPC permissions have drifted from the committed permission records:")
    for (const d of drift) console.error(`  ${d}`)
    console.error("\nIf the change is intended, land the migration that made it and regenerate with --write.")
    process.exit(1)
  }
  console.log("Live RPC permissions match the committed matrix.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
