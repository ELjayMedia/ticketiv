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
const client = createClient(url, serviceKey, { auth: { persistSession: false } })

// Seed UAT fixtures FIRST (this calls teardown internally)
const fn = teardown ? "fn_teardown_uat_fixtures" : "fn_seed_uat_fixtures"
const { data, error } = await client.rpc(fn)

if (error) {
  console.error(`${fn} failed: ${error.message}`)
  process.exit(1)
}

if (!teardown) {
  const acknowledged =
    data && typeof data === "object" &&
    ((data.ok === true && data.currency === "ZAR") || data.seeded === true)
  if (!acknowledged) {
    console.error(`${fn} returned an unexpected acknowledgement.`)
    process.exit(1)
  }

  const { data: ticketType, error: ticketTypeError } = await client
    .from("ticket_types")
    .select("currency")
    .eq("id", "da7a0004-0000-4000-8000-000000000001")
    .single()
  if (ticketTypeError || ticketType?.currency !== "ZAR") {
    console.error(`UAT fixture currency verification failed: ${ticketTypeError?.message ?? "expected ZAR"}`)
    process.exit(1)
  }
}

// Seed public discovery event AFTER UAT fixtures so it survives teardown
// (the UAT teardown deletes the shared fixture organization and venue).
const { data: publicData, error: pubErr } = await client.rpc(
  teardown ? "fn_teardown_public_discovery_event" : "fn_seed_public_discovery_event",
)
if (pubErr) {
  console.error(`Public discovery event ${teardown ? "teardown" : "seed"} failed: ${pubErr.message}`)
  process.exit(1)
}
if (!teardown && !(publicData && typeof publicData === "object" && publicData.seeded === true)) {
  console.error("Public discovery seed returned an unexpected acknowledgement.")
  process.exit(1)
}

console.log(teardown ? "UAT fixtures removed." : "UAT fixtures seeded.")
console.log(JSON.stringify(data, null, 2))
