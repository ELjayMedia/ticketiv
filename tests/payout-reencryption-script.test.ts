import { afterEach, describe, expect, it } from "vitest"

import {
  decryptPayoutDetails,
  encryptPayoutDetails,
  payoutDetailsKeyId,
} from "../lib/payout-crypto-core"
import { buildPayoutReencryptionPlan } from "../scripts/reencrypt-payout-accounts.mjs"

const ENV_KEYS = [
  "PAYOUT_ENCRYPTION_KEY",
  "PAYOUT_ENCRYPTION_KEY_ID",
  "PAYOUT_ENCRYPTION_PREVIOUS_KEYS",
]
const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(restoreEnv)

describe("payout account re-encryption plan", () => {
  it("migrates plaintext and retired-key rows without returning sensitive values in its summary", () => {
    process.env.PAYOUT_ENCRYPTION_KEY = "retired-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "retired-key"
    const retired = encryptPayoutDetails({ account_number: "11112222" })

    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "active-key"
    process.env.PAYOUT_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify({
      "retired-key": "retired-secret",
    })
    const current = encryptPayoutDetails({ account_number: "33334444" })
    const plaintext = JSON.stringify({ account_number: "55556666" })

    const plan = buildPayoutReencryptionPlan([
      { id: "current", details_encrypted: current },
      { id: "retired", details_encrypted: retired },
      { id: "plaintext", details_encrypted: plaintext },
    ])

    expect(plan.summary).toEqual({
      totalRows: 3,
      currentRows: 1,
      candidateRows: 2,
      unreadableRows: 0,
      candidateFormats: {
        "legacy-plaintext": 1,
        "encrypted-v1": 0,
        "retired-v2-key": 1,
      },
    })
    expect(JSON.stringify(plan.summary)).not.toContain("11112222")
    expect(JSON.stringify(plan.summary)).not.toContain("55556666")
    expect(plan.candidates).toHaveLength(2)

    for (const candidate of plan.candidates) {
      expect(payoutDetailsKeyId(candidate.encryptedDetails)).toBe("active-key")
      expect(decryptPayoutDetails(candidate.encryptedDetails)).toBeTruthy()
      expect(candidate.expectedSha256).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it("refuses unknown or unreadable storage instead of guessing", () => {
    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "active-key"

    const plan = buildPayoutReencryptionPlan([
      { id: "unknown", details_encrypted: "enc:v3:not-supported" },
      { id: "malformed", details_encrypted: "not-json" },
    ])

    expect(plan.summary).toMatchObject({
      totalRows: 2,
      currentRows: 0,
      candidateRows: 0,
      unreadableRows: 2,
    })
    expect(plan.candidates).toEqual([])
  })

  it("does not count tampered active-key ciphertext as current", () => {
    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "active-key"
    const encodedKeyId = Buffer.from("active-key", "utf8").toString("base64url")

    const plan = buildPayoutReencryptionPlan([
      { id: "tampered", details_encrypted: `enc:v2:${encodedKeyId}:MTIz:MTIz:MTIz` },
    ])

    expect(plan.summary).toMatchObject({
      totalRows: 1,
      currentRows: 0,
      candidateRows: 0,
      unreadableRows: 1,
    })
  })
})
