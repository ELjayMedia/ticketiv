import { describe, expect, it, beforeAll } from "vitest"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

// TICK-174 — RLS cross-tenant isolation.
//
// Runs against a DEDICATED Supabase test project/branch — never production.
// Seed it with two orgs (A, B), each owning an event + at least one order,
// and two users who are members of A and B respectively. Provide via env:
//
//   TEST_SUPABASE_URL
//   TEST_SUPABASE_ANON_KEY
//   TEST_USER_A_EMAIL / TEST_USER_A_PASSWORD   (member of org A)
//   TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD   (member of org B)
//   TEST_ORG_A_ID                              (org A's uuid)
//
// Without these the whole suite skips, so `pnpm test` stays green in CI until
// the test project is wired up (depends on TICK-181 staging).

const URL = process.env.TEST_SUPABASE_URL
const ANON = process.env.TEST_SUPABASE_ANON_KEY
const A_EMAIL = process.env.TEST_USER_A_EMAIL
const A_PASSWORD = process.env.TEST_USER_A_PASSWORD
const B_EMAIL = process.env.TEST_USER_B_EMAIL
const B_PASSWORD = process.env.TEST_USER_B_PASSWORD
const ORG_A_ID = process.env.TEST_ORG_A_ID

const configured = Boolean(URL && ANON && A_EMAIL && A_PASSWORD && B_EMAIL && B_PASSWORD && ORG_A_ID)

async function signedInClient(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(URL!, ANON!, { auth: { persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return client
}

describe.skipIf(!configured)("RLS cross-tenant isolation", () => {
  let clientB: SupabaseClient

  beforeAll(async () => {
    clientB = await signedInClient(B_EMAIL!, B_PASSWORD!)
  })

  it("user B cannot read org A's orders", async () => {
    const { data, error } = await clientB.from("orders").select("id").eq("org_id", ORG_A_ID!)
    // RLS scopes reads to the caller's orgs → either an empty set or a policy error,
    // never org A's rows leaking to user B.
    expect(error ?? null).toBeNull()
    expect(data ?? []).toHaveLength(0)
  })

  it("user B cannot write into org A (insert is rejected by RLS)", async () => {
    const { error } = await clientB.from("orders").insert({
      org_id: ORG_A_ID!,
      buyer_id: "00000000-0000-0000-0000-000000000000",
      total_cents: 1000,
      currency: "SZL",
    } as never)
    // Direct client writes to protected tables must fail (RLS + the rule that
    // mutations go through SECURITY DEFINER RPCs).
    expect(error).not.toBeNull()
  })

  it("anon cannot read any orders", async () => {
    const anon = createClient(URL!, ANON!, { auth: { persistSession: false } })
    const { data } = await anon.from("orders").select("id").limit(1)
    expect(data ?? []).toHaveLength(0)
  })
})

// Visibility marker so the suite's existence is obvious in CI output even when
// the integration cases are skipped for lack of a test project.
describe("RLS isolation harness", () => {
  it(configured ? "is configured against a test project" : "is present but skipped (no TEST_SUPABASE_* env)", () => {
    expect(true).toBe(true)
  })
})
