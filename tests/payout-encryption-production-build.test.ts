import { describe, expect, it, vi } from "vitest"

import { verifyProductionPayoutEncryption } from "../scripts/verify-production-payout-encryption.mjs"

describe("production payout encryption runtime gate", () => {
  it("skips local and preview builds", () => {
    const verifyKeyring = vi.fn()

    expect(
      verifyProductionPayoutEncryption({ deploymentEnv: "preview", verifyKeyring }),
    ).toEqual({ checked: false })
    expect(verifyKeyring).not.toHaveBeenCalled()
  })

  it("requires a valid keyring for production", () => {
    const verifyKeyring = vi.fn(() => "2026-08-a")

    expect(
      verifyProductionPayoutEncryption({ deploymentEnv: "production", verifyKeyring }),
    ).toEqual({ checked: true })
    expect(verifyKeyring).toHaveBeenCalledOnce()
  })

  it("fails production when keyring validation fails", () => {
    const verifyKeyring = vi.fn(() => {
      throw new Error("invalid keyring")
    })

    expect(() =>
      verifyProductionPayoutEncryption({ deploymentEnv: "production", verifyKeyring }),
    ).toThrow("invalid keyring")
  })

  it("accepts the legacy Vercel environment only as a compatibility fallback", () => {
    const verifyKeyring = vi.fn(() => "compatibility-key")
    const previousDeploymentEnv = process.env.DEPLOYMENT_ENV
    const previousVercelEnv = process.env.VERCEL_ENV
    delete process.env.DEPLOYMENT_ENV
    process.env.VERCEL_ENV = "production"

    try {
      expect(verifyProductionPayoutEncryption({ verifyKeyring })).toEqual({ checked: true })
      expect(verifyKeyring).toHaveBeenCalledOnce()
    } finally {
      if (previousDeploymentEnv === undefined) delete process.env.DEPLOYMENT_ENV
      else process.env.DEPLOYMENT_ENV = previousDeploymentEnv
      if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = previousVercelEnv
    }
  })
})
