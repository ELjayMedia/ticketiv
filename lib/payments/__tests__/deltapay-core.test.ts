import { describe, expect, it } from "vitest"

import {
  centsToDeltaPayAmount,
  deltaPayAmountToCents,
  evaluateDeltaPayConfig,
} from "@/lib/payments/deltapay-core"

describe("DeltaPay amount conversion", () => {
  it("converts Ticketiv cents to DeltaPay SZL major units without dropping cents", () => {
    expect(centsToDeltaPayAmount(25_000)).toBe(250)
    expect(centsToDeltaPayAmount(10_544)).toBe(105.44)
    expect(centsToDeltaPayAmount(1)).toBe(0.01)
  })

  it("converts verified DeltaPay amounts back to exact Ticketiv cents", () => {
    expect(deltaPayAmountToCents(250)).toBe(25_000)
    expect(deltaPayAmountToCents(105.44)).toBe(10_544)
    expect(deltaPayAmountToCents(0.01)).toBe(1)
  })

  it("rejects invalid or unsupported-precision amounts", () => {
    expect(() => centsToDeltaPayAmount(0)).toThrow()
    expect(() => centsToDeltaPayAmount(10.5)).toThrow()
    expect(() => deltaPayAmountToCents(0)).toThrow()
    expect(() => deltaPayAmountToCents(1.001)).toThrow(/unsupported precision/)
  })
})

describe("evaluateDeltaPayConfig", () => {
  it("allows the development host with an API key outside production", () => {
    expect(
      evaluateDeltaPayConfig({
        apiKey: "development-key",
        baseUrl: "https://api.dev.deltacrypt.net",
        deploymentEnv: "preview",
        productionEnabled: "false",
      }),
    ).toMatchObject({
      operational: true,
      baseUrl: "https://api.dev.deltacrypt.net",
      problems: [],
    })
  })

  it("fails closed when the API key is missing", () => {
    const state = evaluateDeltaPayConfig({
      baseUrl: "https://api.dev.deltacrypt.net",
      deploymentEnv: "preview",
    })
    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain("DELTAPAY_API_KEY")
  })

  it("does not allow the development API in a production deployment", () => {
    const state = evaluateDeltaPayConfig({
      apiKey: "key",
      baseUrl: "https://api.dev.deltacrypt.net",
      deploymentEnv: "production",
      productionEnabled: "true",
    })
    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain("Production DeltaPay must use")
  })

  it("requires an explicit production activation switch even on the production host", () => {
    const state = evaluateDeltaPayConfig({
      apiKey: "key",
      baseUrl: "https://api.prod.deltacrypt.net",
      deploymentEnv: "production",
      productionEnabled: "false",
    })
    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain("DELTAPAY_PRODUCTION_ENABLED")
  })

  it("accepts production only when the host, key and explicit activation all agree", () => {
    expect(
      evaluateDeltaPayConfig({
        apiKey: "production-key",
        baseUrl: "https://api.prod.deltacrypt.net/",
        deploymentEnv: "production",
        productionEnabled: "true",
      }),
    ).toEqual({
      apiKey: "production-key",
      baseUrl: "https://api.prod.deltacrypt.net",
      operational: true,
      problems: [],
    })
  })

  it("rejects arbitrary hosts even if they use HTTPS", () => {
    const state = evaluateDeltaPayConfig({
      apiKey: "key",
      baseUrl: "https://example.com",
      deploymentEnv: "preview",
    })
    expect(state.operational).toBe(false)
    expect(state.problems.join(" ")).toContain("approved DeltaPay API host")
  })
})
