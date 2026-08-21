import { describe, expect, it, vi } from "vitest"

import { verifyProductionPayoutEncryption } from "../scripts/verify-production-payout-encryption.mjs"

describe("production payout encryption build gate", () => {
  it("skips local and preview builds", () => {
    const verifyKeyring = vi.fn()

    expect(
      verifyProductionPayoutEncryption({ vercelEnv: "preview", verifyKeyring }),
    ).toEqual({ checked: false })
    expect(verifyKeyring).not.toHaveBeenCalled()
  })

  it("requires a valid keyring for production", () => {
    const verifyKeyring = vi.fn(() => "2026-08-a")

    expect(
      verifyProductionPayoutEncryption({ vercelEnv: "production", verifyKeyring }),
    ).toEqual({ checked: true })
    expect(verifyKeyring).toHaveBeenCalledOnce()
  })

  it("fails production when keyring validation fails", () => {
    const verifyKeyring = vi.fn(() => {
      throw new Error("invalid keyring")
    })

    expect(() =>
      verifyProductionPayoutEncryption({ vercelEnv: "production", verifyKeyring }),
    ).toThrow("invalid keyring")
  })
})
