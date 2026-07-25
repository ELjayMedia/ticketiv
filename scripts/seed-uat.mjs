// TICK-341 — seed or tear down UAT fixtures.
//
// Thin wrapper over fn_seed_uat_fixtures() / fn_teardown_uat_fixtures(), which
// hold all the logic. See docs/UAT_FIXTURES.md.
//
//   node scripts/seed-uat.mjs            # seed (idempotent — resets first)
//   node scripts/seed-uat.mjs --teardown # remove every fixture
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
//
// Unlike the check:* scripts, this EXITS NON-ZERO when credentials are missing.
// A check that cannot run should skip; a seed that cannot run has not seeded,
// and silently "succeeding" would leave a test suite to fail confusingly later.

import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  process.exit(1)
}

const teardown = process.argv.includes("--teardown")
const fn = teardown ? "fn_teardown_uat_fixtures" : "fn_seed_uat_fixtures"

const client = createClient(url, serviceKey, { auth: { persistSession: false } })
const { data, error } = await client.rpc(fn)

if (error) {
  console.error(`${fn} failed: ${error.message}`)
  process.exit(1)
}

console.log(teardown ? "UAT fixtures removed." : "UAT fixtures seeded.")
console.log(JSON.stringify(data, null, 2))
