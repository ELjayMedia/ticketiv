import fs from "node:fs"
import path from "node:path"
import { constants, createSign, generateKeyPairSync } from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  buildEpsWithdrawal,
  deltaPaySignedPayload,
  evaluateDeltaPayWalletConfig,
  payoutIdFromReference,
  payoutReference,
  payoutStatusForTransaction,
  readPreview,
  verifyDeltaPayCallback,
} from "@/lib/payments/deltapay-wallet-core"
import { checkEpsAccount } from "@/lib/payouts/eps-directory"

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8")
const PAYOUT = "531aa7c1-6a07-4e4d-b0a2-efad7173ad4f"

describe("EPS payout destinations", () => {
  it("validates bank account numbers against the switch's published formats", () => {
    expect(checkEpsAccount("fnb", "6212 345 6789")).toMatchObject({ ok: true, accountNumber: "62123456789", destination: { agentId: "103002", scheme: "ACCT" } })
    expect(checkEpsAccount("standard_bank", "9111234567890")).toMatchObject({ ok: true, destination: { agentId: "103004" } })
    expect(checkEpsAccount("fnb", "12345")).toMatchObject({ ok: false, reason: "invalid_number" })
  })

  it("normalizes mobile-money numbers and routes them as wallets", () => {
    expect(checkEpsAccount("mtn_momo", "+268 7612 3456")).toMatchObject({ ok: true, accountNumber: "76123456", destination: { agentId: "203003", scheme: "EWLT" } })
    expect(checkEpsAccount("mtn_momo", "79123456")).toMatchObject({ ok: false, reason: "invalid_number" })
  })

  it("leaves banks that aren't on the switch to manual payouts", () => {
    expect(checkEpsAccount("absa", "1234567890")).toMatchObject({ ok: false, reason: "not_eps" })
  })
})

describe("DeltaPay wallet config (fail-closed)", () => {
  const complete = {
    apiKey: "k",
    walletAddress: "0x" + "a".repeat(40),
    privateKey: "0x" + "b".repeat(64),
    callbackPublicKey: "-----BEGIN PUBLIC KEY-----\\nabc\\n-----END PUBLIC KEY-----",
    payoutsEnabled: "true",
    deploymentEnv: "preview",
  }

  it("is operational on the development host with every variable set", () => {
    const config = evaluateDeltaPayWalletConfig(complete)
    expect(config.operational).toBe(true)
    expect(config.baseUrl).toBe("https://api.dev.deltacrypt.net")
    expect(config.callbackPublicKey).toContain("\n") // escaped newlines from env are restored
  })

  it("refuses without the explicit payouts switch, a key, or a valid wallet address", () => {
    expect(evaluateDeltaPayWalletConfig({ ...complete, payoutsEnabled: "false" }).operational).toBe(false)
    expect(evaluateDeltaPayWalletConfig({ ...complete, privateKey: "" }).problems).toContain("DELTAPAY_WALLET_PRIVATE_KEY is not set.")
    expect(evaluateDeltaPayWalletConfig({ ...complete, walletAddress: "not-an-address" }).operational).toBe(false)
  })

  it("never sends real money without the production switch and host", () => {
    expect(evaluateDeltaPayWalletConfig({ ...complete, deploymentEnv: "production" }).operational).toBe(false)
    expect(evaluateDeltaPayWalletConfig({ ...complete, baseUrl: "https://api.prod.deltacrypt.net" }).operational).toBe(false)
    expect(evaluateDeltaPayWalletConfig({ ...complete, deploymentEnv: "production", baseUrl: "https://api.prod.deltacrypt.net", productionEnabled: "true" }).operational).toBe(true)
    expect(evaluateDeltaPayWalletConfig({ ...complete, baseUrl: "https://evil.example" }).operational).toBe(false)
  })
})

describe("EPS withdrawal request", () => {
  it("sends exact major units, our reference as metadata, and never the private key from the builder", () => {
    const body = buildEpsWithdrawal({ payoutId: PAYOUT, amountCents: 50_000, agentId: "103002", accountNumber: "62123456789", scheme: "ACCT", note: "x".repeat(300) })
    expect(body).toEqual({
      amount: 500,
      instructed_agent_id: "103002",
      creditor_account_id: "62123456789",
      creditor_account_scheme: "ACCT",
      note: "x".repeat(200),
      metadata: `ticketiv-payout:${PAYOUT}`,
    })
    expect(JSON.stringify(body)).not.toContain("private_key")
    expect(buildEpsWithdrawal({ payoutId: PAYOUT, amountCents: 10_544, agentId: "1", accountNumber: "1", scheme: "EWLT", note: "" }).amount).toBe(105.44)
  })

  it("round-trips the payout reference and rejects anything else", () => {
    expect(payoutIdFromReference(payoutReference(PAYOUT))).toBe(PAYOUT)
    expect(payoutIdFromReference("order:123")).toBeNull()
    expect(payoutIdFromReference(null)).toBeNull()
  })

  it("reads the preview verdict and fee", () => {
    expect(readPreview({ transaction_possible: { possible: true }, fee_info: { fee: 2.5 } })).toEqual({ possible: true, feeCents: 250, reason: null })
    expect(readPreview({ transaction_possible: { possible: false, error_name: "ERR_INSUFFICIENT_BALANCE", error_arguments: ["500"] } })).toMatchObject({
      possible: false,
      reason: "ERR_INSUFFICIENT_BALANCE (500)",
    })
    expect(readPreview(null).possible).toBe(false)
  })

  it("maps DeltaPay transaction statuses to payout statuses", () => {
    expect(payoutStatusForTransaction("succeeded")).toBe("paid")
    expect(payoutStatusForTransaction("reversed")).toBe("failed")
    expect(payoutStatusForTransaction("failed")).toBe("failed")
    expect(payoutStatusForTransaction("approved")).toBe("processing")
    expect(payoutStatusForTransaction("weird")).toBeNull()
  })
})

describe("DeltaPay callback signatures (RSA-PSS / SHA-256 over Python json.dumps)", () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 })
  const pem = publicKey.export({ type: "spki", format: "pem" }).toString()

  function signedBody(fields: Record<string, unknown>, rawOverrides?: (json: string) => string) {
    let json = JSON.stringify({ ...fields, signature: "SIG" })
    if (rawOverrides) json = rawOverrides(json)
    const { signed } = deltaPaySignedPayload(json)
    const signature = createSign("sha256").update(signed).sign({ key: privateKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: constants.RSA_PSS_SALTLEN_MAX_SIGN }).toString("base64")
    return json.replace('"SIG"', JSON.stringify(signature))
  }

  const ipn = { transaction_id: 398, transaction_status: "succeeded", amount: 500, metadata: `ticketiv-payout:${PAYOUT}`, note: "Ticketiv payout · ✓", bank_account: null }

  it("reproduces Python's sort_keys / separators / ASCII escaping", () => {
    expect(deltaPaySignedPayload('{"b": 1, "a": "é", "c": 500.0, "signature": "x"}').signed).toBe('{"a": "\\u00e9", "b": 1, "c": 500.0}')
    expect(deltaPaySignedPayload('{"c": 1.50, "signature": "x"}').signed).toBe('{"c": 1.5}')
  })

  it("accepts a genuine callback, including Python float spelling", () => {
    expect(verifyDeltaPayCallback(signedBody(ipn), pem)).toBe(true)
    expect(verifyDeltaPayCallback(signedBody(ipn, (j) => j.replace('"amount":500', '"amount":500.0')), pem)).toBe(true)
  })

  it("rejects tampered, unsigned or foreign-key callbacks", () => {
    const body = signedBody(ipn)
    expect(verifyDeltaPayCallback(body.replace('"succeeded"', '"failed"'), pem)).toBe(false)
    expect(verifyDeltaPayCallback(JSON.stringify(ipn), pem)).toBe(false)
    const other = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ type: "spki", format: "pem" }).toString()
    expect(verifyDeltaPayCallback(body, other)).toBe(false)
    expect(verifyDeltaPayCallback("not json", pem)).toBe(false)
  })
})

/* ── Send / settle state machine against an in-memory database ─────────────── */

const mocks = vi.hoisted(() => ({
  rows: new Map<string, Record<string, any>>(),
  audits: [] as Record<string, any>[],
  primaryAccount: { provider: "fnb", details_encrypted: "enc" } as Record<string, any> | null,
  blocked: false,
  preview: vi.fn(),
  send: vi.fn(),
  lookup: vi.fn(),
  operational: true,
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/payout-crypto", () => ({ decryptPayoutDetails: () => ({ account_number: "62123456789" }) }))
vi.mock("@/lib/data/admin/reconciliation", () => ({
  getOrgPayoutReconciliationBlock: async () => ({ blocked: mocks.blocked, blockedEvents: mocks.blocked ? [{ title: "E" }] : [] }),
}))
vi.mock("@/lib/payments/deltapay-wallet", () => ({
  DeltaPayWalletError: class DeltaPayWalletError extends Error {},
  getDeltaPayWalletConfig: () => ({ operational: mocks.operational }),
  previewEpsPayout: mocks.preview,
  sendEpsPayout: mocks.send,
  lookupPayoutTransaction: mocks.lookup,
}))
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      const filters: [string, unknown][] = []
      let patch: Record<string, any> | null = null
      const match = () => [...mocks.rows.values()].filter((r) => filters.every(([k, v]) => r[k] === v))
      const q: any = {
        select: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        update: (p: Record<string, any>) => ((patch = p), q),
        insert: (row: Record<string, any>) => {
          if (table === "audit_log") mocks.audits.push(row)
          return Promise.resolve({ error: null })
        },
        maybeSingle: async () => {
          if (table === "payout_accounts") return { data: mocks.primaryAccount, error: null }
          const found = match()[0] ?? null
          if (found && patch) Object.assign(found, patch)
          return { data: found ? { ...found } : null, error: null }
        },
        then: (resolve: (v: unknown) => void) => {
          if (patch) for (const r of match()) Object.assign(r, patch)
          resolve({ error: null })
        },
      }
      return q
    },
  }),
}))

import { applyDeltaPayPayoutUpdate, sendPayoutViaDeltaPay } from "@/lib/payouts/deltapay-payouts"

function seed(overrides: Record<string, any> = {}) {
  mocks.rows.clear()
  mocks.rows.set(PAYOUT, {
    id: PAYOUT,
    org_id: "org-1",
    status: "requested",
    amount_cents: 50_000,
    currency: "SZL",
    provider_rail: null,
    provider_transaction_id: null,
    ...overrides,
  })
  return mocks.rows.get(PAYOUT)!
}

describe("sending a payout through DeltaPay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.audits.length = 0
    mocks.blocked = false
    mocks.operational = true
    mocks.primaryAccount = { provider: "fnb", details_encrypted: "enc" }
    mocks.preview.mockResolvedValue({ possible: true, feeCents: 0, reason: null })
    mocks.send.mockResolvedValue({ trackingId: "0xabc", reference: `ticketiv-payout:${PAYOUT}` })
    mocks.lookup.mockResolvedValue(null)
  })

  it("previews, claims, then sends to the primary account over EPS", async () => {
    const row = seed()
    await sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "admin-1", note: null })
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ payoutId: PAYOUT, amountCents: 50_000, agentId: "103002", accountNumber: "62123456789", scheme: "ACCT" }))
    expect(row).toMatchObject({ status: "processing", provider_rail: "deltapay", provider_reference: `ticketiv-payout:${PAYOUT}`, provider_tracking_id: "0xabc" })
    expect(mocks.audits.map((a) => a.changes.business_action)).toContain("deltapay_payout_submitted")
  })

  it("refuses while reconciliation is blocked, and never sends", async () => {
    seed()
    mocks.blocked = true
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/reconciliation/)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("refuses a rejected preview, and a bank that isn't on the switch", async () => {
    seed()
    mocks.preview.mockResolvedValue({ possible: false, feeCents: null, reason: "ERR_INSUFFICIENT_BALANCE" })
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/INSUFFICIENT/)
    seed()
    mocks.primaryAccount = { provider: "absa", details_encrypted: "enc" }
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/manually/)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("only sends requested or failed payouts (a second click can't double-send)", async () => {
    seed({ status: "processing", provider_rail: "deltapay" })
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/processing/)
    expect(mocks.send).not.toHaveBeenCalled()
  })

  it("never resends a failed payout DeltaPay already has a transfer for", async () => {
    const row = seed({ status: "failed", provider_rail: "deltapay" })
    mocks.lookup.mockResolvedValue({ transactionId: 77, status: "succeeded", amount: 500, metadata: `ticketiv-payout:${PAYOUT}` })
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/already has a transfer/)
    expect(mocks.send).not.toHaveBeenCalled()
    expect(row.status).toBe("paid")
  })

  it("keeps an unknown-outcome send in processing instead of inviting a resend", async () => {
    const row = seed()
    const { DeltaPayWalletError } = await import("@/lib/payments/deltapay-wallet")
    mocks.send.mockRejectedValue(new DeltaPayWalletError("Unable to reach DeltaPay"))
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/Check DeltaPay status/)
    expect(row.status).toBe("processing")
  })

  it("marks a definite rejection failed so it can be retried", async () => {
    const row = seed()
    const { DeltaPayWalletError } = await import("@/lib/payments/deltapay-wallet")
    mocks.send.mockRejectedValue(new DeltaPayWalletError("Invalid creditor account"))
    await expect(sendPayoutViaDeltaPay({ payoutId: PAYOUT, actorId: "a", note: null })).rejects.toThrow(/rejected/)
    expect(row).toMatchObject({ status: "failed", failure_reason: "Invalid creditor account" })
  })
})

describe("settling from DeltaPay updates", () => {
  it("marks paid only on succeeded for the exact amount, idempotently", async () => {
    const row = seed({ status: "processing", provider_rail: "deltapay" })
    expect(await applyDeltaPayPayoutUpdate({ payoutId: PAYOUT, status: "approved", transactionId: 9, amount: 500, source: "callback" })).toBe("processing")
    expect(row.status).toBe("processing")
    expect(await applyDeltaPayPayoutUpdate({ payoutId: PAYOUT, status: "succeeded", transactionId: 9, amount: 500, source: "callback" })).toBe("paid")
    expect(row).toMatchObject({ status: "paid", provider_transaction_id: 9 })
    expect(await applyDeltaPayPayoutUpdate({ payoutId: PAYOUT, status: "succeeded", transactionId: 9, amount: 500, source: "callback" })).toBe("unchanged")
  })

  it("refuses a mismatched amount", async () => {
    const row = seed({ status: "processing", provider_rail: "deltapay" })
    expect(await applyDeltaPayPayoutUpdate({ payoutId: PAYOUT, status: "succeeded", transactionId: 9, amount: 5, source: "callback" })).toBe("amount_mismatch")
    expect(row.status).toBe("processing")
  })

  it("marks a failed or reversed transfer failed", async () => {
    const row = seed({ status: "processing", provider_rail: "deltapay" })
    expect(await applyDeltaPayPayoutUpdate({ payoutId: PAYOUT, status: "reversed", transactionId: 9, amount: 500, source: "callback" })).toBe("failed")
    expect(row.status).toBe("failed")
  })

  it("ignores updates for payouts that weren't sent through DeltaPay", async () => {
    const row = seed({ status: "processing", provider_rail: null })
    expect(await applyDeltaPayPayoutUpdate({ payoutId: PAYOUT, status: "succeeded", transactionId: 9, amount: 500, source: "callback" })).toBe("ignored")
    expect(row.status).toBe("processing")
  })
})

describe("wiring guards", () => {
  it("lets DeltaPay's servers and returning guests reach the DeltaPay routes", () => {
    expect(read("lib/supabase/middleware.ts")).toContain('path.startsWith("/api/payments/deltapay/")')
  })

  it("acts on wallet callbacks only after the signature verifies", () => {
    const route = read("app/api/payments/deltapay/wallet/transaction/ipn/route.ts")
    expect(route.indexOf("verifyDeltaPayCallback(raw, callbackPublicKey)")).toBeGreaterThan(-1)
    expect(route.indexOf("verifyDeltaPayCallback(raw, callbackPublicKey)")).toBeLessThan(route.indexOf("applyDeltaPayPayoutUpdate("))
    expect(route).toContain('{ status: 401 }')
  })

  it("doesn't let finance manually mark a DeltaPay payout paid", () => {
    expect(read("app/super-admin/finance-actions.ts")).toContain('provider_rail === "deltapay"')
  })
})
