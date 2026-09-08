import { describe, expect, it } from "vitest"

import {
  assertProviderReadinessState,
  type ProviderProductionReadiness,
} from "@/lib/payments/provider-readiness-core"

function state(overrides: Partial<ProviderProductionReadiness> = {}): ProviderProductionReadiness {
  return {
    provider: "paystack",
    productionReady: false,
    approvedAt: null,
    approvedBy: null,
    evidenceRefs: [],
    blockedAt: null,
    blockedReason: null,
    ...overrides,
  }
}

describe("provider production readiness", () => {
  it("fails closed when a provider has not been approved", () => {
    expect(() => assertProviderReadinessState(state())).toThrow(/TICK-400 production-readiness gate/)
  })

  it("rejects a nominal approval with incomplete evidence", () => {
    expect(() =>
      assertProviderReadinessState(
        state({ productionReady: true, approvedAt: "2026-09-07T12:00:00Z", approvedBy: "user-1" }),
      ),
    ).toThrow(/approval evidence is incomplete/)
  })

  it("rejects a blocked provider even if stale data says it is ready", () => {
    expect(() =>
      assertProviderReadinessState(
        state({
          productionReady: true,
          approvedAt: "2026-09-07T12:00:00Z",
          approvedBy: "user-1",
          evidenceRefs: ["TICK-400"],
          blockedAt: "2026-09-07T12:30:00Z",
          blockedReason: "provider outage",
        }),
      ),
    ).toThrow(/provider production readiness is blocked/)
  })

  it("allows a complete, unblocked production approval", () => {
    expect(() =>
      assertProviderReadinessState(
        state({
          productionReady: true,
          approvedAt: "2026-09-07T12:00:00Z",
          approvedBy: "user-1",
          evidenceRefs: ["TICK-400", "provider-uat-record"],
        }),
      ),
    ).not.toThrow()
  })
})
