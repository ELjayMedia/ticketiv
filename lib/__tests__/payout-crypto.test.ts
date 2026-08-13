import { afterEach, describe, expect, it } from "vitest"
import { createCipheriv, createHash, randomBytes } from "node:crypto"

import {
  PayoutEncryptionConfigurationError,
  activePayoutEncryptionKeyId,
  decryptPayoutDetails,
  encryptPayoutDetails,
  isPayoutEncryptionConfigured,
  maskedAccountFromStored,
  payoutDetailsKeyId,
  payoutDetailsStorageKind,
} from "@/lib/payout-crypto"

const ENV_KEYS = [
  "PAYOUT_ENCRYPTION_KEY",
  "PAYOUT_ENCRYPTION_KEY_ID",
  "PAYOUT_ENCRYPTION_PREVIOUS_KEYS",
] as const

const originalEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]))

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = originalEnv[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
}

afterEach(() => {
  restoreEnv()
})

function clearEncryptionEnv() {
  for (const key of ENV_KEYS) delete process.env[key]
}

function makeV1(details: Record<string, unknown>, secret: string): string {
  const key = createHash("sha256").update(secret).digest()
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key, iv)
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(details), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return `enc:v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`
}

describe("payout detail encryption", () => {
  it("fails closed instead of writing plaintext when encryption is not configured", () => {
    clearEncryptionEnv()

    expect(isPayoutEncryptionConfigured()).toBe(false)
    expect(() => encryptPayoutDetails({ account_number: "12345678" })).toThrow(
      PayoutEncryptionConfigurationError,
    )
  })

  it("requires an explicit active key id for new ciphertext", () => {
    clearEncryptionEnv()
    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"

    expect(() => encryptPayoutDetails({ account_number: "12345678" })).toThrow(
      PayoutEncryptionConfigurationError,
    )
  })

  it("rejects an active key id duplicated in the previous-key map", () => {
    clearEncryptionEnv()
    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "active-key"
    process.env.PAYOUT_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify({
      "active-key": "different-secret",
    })

    expect(isPayoutEncryptionConfigured()).toBe(false)
    expect(() => encryptPayoutDetails({ account_number: "12345678" })).toThrow(
      PayoutEncryptionConfigurationError,
    )
  })

  it("writes v2 ciphertext and round-trips with the active key", () => {
    clearEncryptionEnv()
    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "2026-08"

    const details = {
      account_name: "UAT Account",
      account_number: "12345678",
      branch_code: "470010",
    }
    const stored = encryptPayoutDetails(details)

    expect(stored).toMatch(/^enc:v2:/)
    expect(stored).not.toContain("12345678")
    expect(payoutDetailsStorageKind(stored)).toBe("encrypted-v2")
    expect(activePayoutEncryptionKeyId()).toBe("2026-08")
    expect(payoutDetailsKeyId(stored)).toBe("2026-08")
    expect(decryptPayoutDetails(stored)).toEqual(details)
    expect(maskedAccountFromStored(stored)).toBe("••••5678")
  })

  it("keeps old v2 ciphertext readable after rotating the active key", () => {
    clearEncryptionEnv()
    process.env.PAYOUT_ENCRYPTION_KEY = "old-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "old-key"
    const oldCiphertext = encryptPayoutDetails({ account_number: "11112222" })

    process.env.PAYOUT_ENCRYPTION_KEY = "new-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "new-key"
    process.env.PAYOUT_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify({
      "old-key": "old-secret",
    })

    expect(decryptPayoutDetails(oldCiphertext)).toEqual({ account_number: "11112222" })

    const newCiphertext = encryptPayoutDetails({ account_number: "33334444" })
    const encodedNewKeyId = Buffer.from("new-key", "utf8").toString("base64url")
    expect(newCiphertext).toMatch(new RegExp(`^enc:v2:${encodedNewKeyId}:`))
    expect(decryptPayoutDetails(newCiphertext)).toEqual({ account_number: "33334444" })
  })

  it("can decrypt legacy v1 ciphertext with a retained previous key", () => {
    clearEncryptionEnv()
    const v1 = makeV1({ account_number: "55556666" }, "legacy-secret")

    process.env.PAYOUT_ENCRYPTION_KEY = "new-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "new-key"
    process.env.PAYOUT_ENCRYPTION_PREVIOUS_KEYS = JSON.stringify({
      "legacy-key": "legacy-secret",
    })

    expect(payoutDetailsStorageKind(v1)).toBe("encrypted-v1")
    expect(decryptPayoutDetails(v1)).toEqual({ account_number: "55556666" })
  })

  it("reads legacy plaintext only for migration compatibility", () => {
    clearEncryptionEnv()
    const legacy = JSON.stringify({ account_number: "77778888" })

    expect(payoutDetailsStorageKind(legacy)).toBe("legacy-plaintext")
    expect(decryptPayoutDetails(legacy)).toEqual({ account_number: "77778888" })
    expect(maskedAccountFromStored(legacy)).toBe("••••8888")
    expect(() => encryptPayoutDetails({ account_number: "99990000" })).toThrow(
      PayoutEncryptionConfigurationError,
    )
  })

  it("fails safely for malformed keyring or ciphertext without logging sensitive values", () => {
    clearEncryptionEnv()
    process.env.PAYOUT_ENCRYPTION_KEY = "active-secret"
    process.env.PAYOUT_ENCRYPTION_KEY_ID = "active"
    process.env.PAYOUT_ENCRYPTION_PREVIOUS_KEYS = "not-json"

    expect(isPayoutEncryptionConfigured()).toBe(false)
    expect(() => encryptPayoutDetails({ account_number: "12345678" })).toThrow(
      PayoutEncryptionConfigurationError,
    )
    expect(decryptPayoutDetails("enc:v2:not-valid")).toBeNull()
    expect(payoutDetailsKeyId("enc:v2:not-valid")).toBeNull()
    expect(decryptPayoutDetails("enc:v1:not:valid:ciphertext")).toBeNull()
  })
})
