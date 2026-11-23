import { describe, expect, it } from "vitest"
import { assertIsolatedUatTarget, isIsolatedUatTarget } from "@/lib/testing/uat-target"

describe("isolated UAT mutation boundary", () => {
  it("accepts only the isolated HTTPS API origin", () => {
    expect(isIsolatedUatTarget("https://uat-api.ticketiv.app")).toBe(true)
    expect(isIsolatedUatTarget("https://uat-api.ticketiv.app/")).toBe(true)
  })

  it.each([
    undefined,
    "https://radsfmlsjznqvcpogluo.supabase.co",
    "https://ticketiv.app",
    "http://uat-api.ticketiv.app",
    "https://uat-api.ticketiv.app.evil.example",
    "https://uat-api.ticketiv.app@evil.example",
    "https://user@uat-api.ticketiv.app",
    "https://uat-api.ticketiv.app/rest/v1",
    "https://uat-api.ticketiv.app?redirect=production",
  ])("rejects unsafe target %s before any mutation", (target) => {
    expect(isIsolatedUatTarget(target)).toBe(false)
    expect(() => assertIsolatedUatTarget(target)).toThrow("production and other targets are rejected")
  })
})
