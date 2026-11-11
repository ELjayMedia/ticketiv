import { afterEach, describe, expect, it } from "vitest"

import { encryptPayoutDetails, payoutDetailsKeyId } from "../lib/payout-crypto-core"
import { buildInternalTestPayoutAccountResetPlan } from "../scripts/reset-internal-test-payout-accounts.mjs"

const ENV_KEYS = ["PAYOUT_ENCRYPTION_KEY", "PAYOUT_ENCRYPTION_KEY_ID", "PAYOUT_ENCRYPTION_PREVIOUS_KEYS"]
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

function retiredEnvelope(details: Record<string, unknown>) {
  process.env.PAYOUT_ENCRYPTION_KEY = "retired-test-secret"
  process.env.PAYOUT_ENCRYPTION_KEY_ID = "2026-09b"
  return encryptPayoutDetails(details)
}

afterEach(restoreEnv)

describe("controlled EljayTunes payout-account reset plan", () => {
  it("prepares exactly the reviewed accounts without decrypting the retired ciphertext", () => {
    const standard = retiredEnvelope({ account_number: "obsolete-one" })
    const fnb = retiredEnvelope({ account_number: "obsolete-two" })
    process.env.PAYOUT_ENCRYPTION_KEY = "replacement-test-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "test-reset-2026-11"

    const replacements = {
      "80e92d91-e165-4db6-8738-7464953d3b23": { account_name: "Synthetic Standard", account_number: "9111234567890", branch_code: "000000" },
      "8851cf54-4a06-4710-a00d-81fb42c6978e": { account_name: "Synthetic FNB", account_number: "62123456789", branch_code: "250655" },
    }
    const plan = buildInternalTestPayoutAccountResetPlan(
      [
        { id: "80e92d91-e165-4db6-8738-7464953d3b23", org_id: "196d016f-1e10-4cea-a6cc-f46c9ee6734a", provider: "standard_bank", details_encrypted: standard },
        { id: "8851cf54-4a06-4710-a00d-81fb42c6978e", org_id: "196d016f-1e10-4cea-a6cc-f46c9ee6734a", provider: "fnb", details_encrypted: fnb },
      ],
      replacements,
    )

    expect(plan.summary).toMatchObject({ accountCount: 2, previousKeyId: "2026-09b", replacementKeyId: "test-reset-2026-11" })
    expect(JSON.stringify(plan.summary)).not.toContain("Synthetic")
    expect(plan.candidates).toHaveLength(2)
    for (const candidate of plan.candidates) {
      expect(candidate.expectedSha256).toMatch(/^[a-f0-9]{64}$/)
      expect(payoutDetailsKeyId(candidate.encryptedDetails)).toBe("test-reset-2026-11")
    }
  })

  it("refuses key-ID reuse and any inventory outside the exact allowlist", () => {
    const old = retiredEnvelope({ account_number: "obsolete" })
    const replacementInput = {
      "80e92d91-e165-4db6-8738-7464953d3b23": { account_name: "Synthetic Standard", account_number: "9111234567890" },
      "8851cf54-4a06-4710-a00d-81fb42c6978e": { account_name: "Synthetic FNB", account_number: "62123456789" },
    }

    expect(() => buildInternalTestPayoutAccountResetPlan([], replacementInput)).toThrow("must not reuse")

    process.env.PAYOUT_ENCRYPTION_KEY = "replacement-test-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "test-reset-2026-11"
    expect(() => buildInternalTestPayoutAccountResetPlan([
      { id: "unexpected", org_id: "196d016f-1e10-4cea-a6cc-f46c9ee6734a", provider: "fnb", details_encrypted: old },
    ], replacementInput)).toThrow("allowlist")
  })
})
