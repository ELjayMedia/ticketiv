import { describe, expect, it } from "vitest"

import { assertPaystackModeAllowed, resolvePaystackKeyMode } from "@/lib/payments/paystack-config"

describe("resolvePaystackKeyMode", () => {
  it("recognises test and live secret keys", () => {
    expect(resolvePaystackKeyMode("sk_test_abc123")).toBe("test")
    expect(resolvePaystackKeyMode("sk_live_abc123")).toBe("live")
  })

  it("treats anything it cannot classify as unknown rather than guessing", () => {
    for (const key of [null, undefined, "", "   ", "pk_live_abc", "some-other-secret"]) {
      expect(resolvePaystackKeyMode(key)).toBe("unknown")
    }
  })

  it("ignores surrounding whitespace from a copy-pasted env var", () => {
    expect(resolvePaystackKeyMode("  sk_live_abc123  ")).toBe("live")
  })
})

describe("assertPaystackModeAllowed", () => {
  // TICK-61 — UAT and production share one environment, so a live key must not
  // be usable until someone deliberately turns live mode on.
  it("throws on a live key when live mode is not allowed", () => {
    expect(() => assertPaystackModeAllowed("sk_live_abc123", false)).toThrow(/PAYSTACK_ALLOW_LIVE_MODE/)
  })

  it("allows a live key once live mode is explicitly enabled", () => {
    expect(() => assertPaystackModeAllowed("sk_live_abc123", true)).not.toThrow()
  })

  it("never blocks a test key", () => {
    expect(() => assertPaystackModeAllowed("sk_test_abc123", false)).not.toThrow()
    expect(() => assertPaystackModeAllowed("sk_test_abc123", true)).not.toThrow()
  })

  it("does not block a missing or unrecognised key, which fails later for its own reasons", () => {
    expect(() => assertPaystackModeAllowed(null, false)).not.toThrow()
    expect(() => assertPaystackModeAllowed("", false)).not.toThrow()
  })
})
