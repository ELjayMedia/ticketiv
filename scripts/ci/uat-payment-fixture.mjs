import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs"
import { createClient } from "@supabase/supabase-js"
import { assertIsolatedUatTarget } from "../../lib/testing/uat-target.ts"

assertIsolatedUatTarget(process.env.TEST_SUPABASE_URL)
const client = createClient(process.env.TEST_SUPABASE_URL, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const backup = `${process.env.RUNNER_TEMP ?? "/tmp"}/ticketiv-uat-payment-fixture.json`
if (process.argv[2] === "prepare") {
  const key = process.env.E2E_PAYSTACK_TEST_KEY
  if (!key?.startsWith("sk_test_")) throw new Error("Only a sandbox payment key is accepted")
  const { data, error } = await client.from("payment_provider_settings").select("*").eq("provider", "paystack").single()
  if (error) throw new Error("Cannot capture prior UAT payment configuration")
  writeFileSync(backup, JSON.stringify(data), { mode: 0o600 })
  const result = await client.from("payment_provider_settings").update({ mode: "test", is_enabled: true, secret_key: key }).eq("provider", "paystack")
  if (result.error) throw new Error("Cannot prepare UAT sandbox payment configuration")
} else if (process.argv[2] === "restore") {
  if (!existsSync(backup)) process.exit(0)
  const previous = JSON.parse(readFileSync(backup, "utf8"))
  const { provider, ...fields } = previous
  const result = await client.from("payment_provider_settings").update(fields).eq("provider", provider)
  if (result.error) throw new Error("Restore the saved UAT payment configuration before running another deployment")
  unlinkSync(backup)
} else throw new Error("Expected prepare or restore")
