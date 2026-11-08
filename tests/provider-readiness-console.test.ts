import fs from "node:fs"
import path from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  looksLikeSecret,
  missingReadinessItems,
  parseEvidence,
  READINESS_ITEMS,
  readinessState,
  requiredReadinessItems,
} from "@/lib/payments/provider-readiness-checklist"
import { CHECKOUT_PROVIDERS } from "@/lib/payments/providers/catalog"

const MIGRATION = fs.readFileSync(
  path.join(process.cwd(), "supabase/migrations/20261112100000_tick403_provider_readiness_console.sql"),
  "utf8",
)

/** Pull the two arrays out of app.provider_readiness_required_items(). */
function sqlRequiredItems(): { paystack: string[]; other: string[] } {
  const body = MIGRATION.slice(MIGRATION.indexOf("app.provider_readiness_required_items"), MIGRATION.indexOf("create or replace function public.fn_admin_provider_readiness"))
  const arrays = [...body.matchAll(/array\[([^\]]+)\]/g)].map((m) => [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]))
  return { paystack: arrays[0], other: arrays[1] }
}

describe("go-live checklist", () => {
  it("matches the database rule that enforces approval", () => {
    const sql = sqlRequiredItems()
    expect(requiredReadinessItems("paystack")).toEqual(sql.paystack)
    expect(requiredReadinessItems("momo")).toEqual(sql.other)
    expect(requiredReadinessItems("deltapay")).toEqual(sql.other)
  })

  it("has a label for every required item and asks card validation of card rails only", () => {
    const labelled = new Set(READINESS_ITEMS.map((i) => i.id))
    for (const provider of CHECKOUT_PROVIDERS) {
      for (const item of requiredReadinessItems(provider)) expect(labelled.has(item), `${provider}:${item}`).toBe(true)
    }
    expect(requiredReadinessItems("paystack")).toContain("card_validation")
    expect(requiredReadinessItems("momo")).not.toContain("card_validation")
  })

  it("parses stored evidence defensively and lists what is missing", () => {
    const evidence = parseEvidence([
      { item: "kyb", ref: "TICK-1", note: null, recorded_at: "2026-11-08T10:00:00Z", recorded_by: "u1" },
      { item: "uat" },
      "junk",
      null,
    ])
    expect(evidence).toHaveLength(1)
    expect(missingReadinessItems("momo", evidence)).not.toContain("kyb")
    expect(missingReadinessItems("momo", evidence)).toHaveLength(6)
    expect(parseEvidence({ not: "an array" })).toEqual([])
  })

  it("derives the badge state, with a block winning over approval", () => {
    expect(readinessState({ productionReady: false, blockedAt: null })).toBe("not_approved")
    expect(readinessState({ productionReady: true, blockedAt: null })).toBe("live")
    expect(readinessState({ productionReady: true, blockedAt: "2026-11-08T10:00:00Z" })).toBe("blocked")
  })
})

describe("looksLikeSecret", () => {
  it("refuses keys, tokens and private keys", () => {
    expect(looksLikeSecret("sk_live_51HxYzAbCdEfGhIjK")).toBe(true)
    expect(looksLikeSecret("see sk_test_abcdefghijk in vercel")).toBe(true)
    expect(looksLikeSecret("-----BEGIN RSA PRIVATE KEY-----\nabc")).toBe(true)
    expect(looksLikeSecret("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc")).toBe(true)
    expect(looksLikeSecret("a3f9c2e81b7d4f60a3f9c2e81b7d4f60a3f9c2e81b7d")).toBe(true)
  })

  it("accepts ordinary references", () => {
    expect(looksLikeSecret("TICK-403")).toBe(false)
    expect(looksLikeSecret("https://drive.google.com/file/d/1AbCdEf/view")).toBe(false)
    expect(looksLikeSecret("Signed merchant agreement, 3 Nov, filed in Legal/Paystack")).toBe(false)
  })
})

describe("readiness console actions", () => {
  const state = vi.hoisted(() => ({
    rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>,
    rpcError: null as { message: string } | null,
    audits: 0,
    role: "super_admin" as string | null,
  }))

  vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
  vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
  vi.mock("@/lib/super-admin/auth", () => ({
    adminForAction: async () => (state.role === "super_admin" ? { user: { id: "admin-1" }, roleTier: "super_admin" } : null),
  }))
  vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: () => ({
      rpc: async (fn: string, args: Record<string, unknown>) => {
        state.rpc.push({ fn, args })
        return { data: null, error: state.rpcError }
      },
      from: () => ({
        insert: async () => {
          state.audits += 1
          return { error: null }
        },
      }),
    }),
  }))

  beforeEach(() => {
    state.rpc = []
    state.rpcError = null
    state.audits = 0
    state.role = "super_admin"
  })

  const form = (values: Record<string, string>) => {
    const data = new FormData()
    for (const [k, v] of Object.entries(values)) data.set(k, v)
    return data
  }

  it("records evidence through the readiness function and audits it", async () => {
    const { recordReadinessEvidenceAction } = await import("@/app/super-admin/console-actions")
    const result = await recordReadinessEvidenceAction({ status: "idle" }, form({ provider: "momo", item: "kyb", ref: "TICK-500", note: "Verified" }))
    expect(result).toEqual({ status: "done", message: "Evidence saved." })
    expect(state.rpc).toEqual([
      {
        fn: "fn_admin_provider_readiness",
        args: { p_provider: "momo", p_action: "record_evidence", p_actor: "admin-1", p_reason: null, p_item: "kyb", p_ref: "TICK-500", p_note: "Verified" },
      },
    ])
    expect(state.audits).toBe(1)
  })

  it("refuses a pasted credential before it reaches the database", async () => {
    const { recordReadinessEvidenceAction } = await import("@/app/super-admin/console-actions")
    const result = await recordReadinessEvidenceAction({ status: "idle" }, form({ provider: "paystack", item: "credentials", ref: "sk_live_51HxYzAbCdEfGhIjK" }))
    expect(result.status).toBe("error")
    expect(state.rpc).toHaveLength(0)
  })

  it("requires a reason to approve, and passes the database's refusal through", async () => {
    const { approveProviderAction } = await import("@/app/super-admin/console-actions")
    expect((await approveProviderAction({ status: "idle" }, form({ provider: "momo", reason: "" }))).status).toBe("error")
    expect(state.rpc).toHaveLength(0)

    state.rpcError = { message: "Checklist incomplete: kyb" }
    const result = await approveProviderAction({ status: "idle" }, form({ provider: "momo", reason: "All checks passed in UAT" }))
    expect(result).toEqual({ status: "error", message: "Checklist incomplete: kyb" })
    expect(state.audits).toBe(0)
  })

  it("emergency-disables in one submit with the prefilled reason", async () => {
    const { emergencyDisableProviderAction } = await import("@/app/super-admin/console-actions")
    const result = await emergencyDisableProviderAction({ status: "idle" }, form({ provider: "paystack", reason: "Emergency disable from the admin console" }))
    expect(result.status).toBe("done")
    expect(state.rpc[0].args).toMatchObject({ p_provider: "paystack", p_action: "block", p_reason: "Emergency disable from the admin console" })
  })

  it("rejects unknown providers and admins without the owner role", async () => {
    const { emergencyDisableProviderAction } = await import("@/app/super-admin/console-actions")
    expect((await emergencyDisableProviderAction({ status: "idle" }, form({ provider: "stripe", reason: "Emergency disable now" }))).status).toBe("error")
    state.role = "finance_admin"
    expect((await emergencyDisableProviderAction({ status: "idle" }, form({ provider: "momo", reason: "Emergency disable now" }))).status).toBe("error")
    expect(state.rpc).toHaveLength(0)
  })
})
