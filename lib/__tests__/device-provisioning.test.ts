import { describe, expect, it } from "vitest"

import {
  formatSetupCode,
  generateSetupCode,
  hashSetupCode,
  normalizeSetupCode,
} from "@/lib/scanner/device-provisioning"

describe("device provisioning setup codes", () => {
  it("normalizes pasted setup codes", () => {
    expect(normalizeSetupCode(" ab-c 123 ")).toBe("ABC123")
  })

  it("formats setup codes in scanner-friendly groups", () => {
    expect(formatSetupCode("abc123")).toBe("ABC-123")
  })

  it("hashes normalized codes consistently", () => {
    expect(hashSetupCode("abc-123")).toBe(hashSetupCode(" ABC123 "))
  })

  it("generates six-character codes without ambiguous characters", () => {
    const code = generateSetupCode()

    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
  })
})
