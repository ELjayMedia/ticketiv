import { describe, expect, it } from "vitest"

import { evaluateMomoOutcome } from "@/lib/payments/momo-status"

describe("evaluateMomoOutcome", () => {
  it("short-circuits already-succeeded attempts (idempotent)", () => {
    expect(evaluateMomoOutcome({ momoStatus: "SUCCESSFUL", attemptStatus: "succeeded", orderStatus: "pending" })).toBe("already_settled")
  })

  it("short-circuits already-paid orders (idempotent across poll + callback)", () => {
    expect(evaluateMomoOutcome({ momoStatus: "PENDING", attemptStatus: "pending", orderStatus: "paid" })).toBe("already_settled")
  })

  it("returns failed for an attempt already marked failed", () => {
    expect(evaluateMomoOutcome({ momoStatus: "PENDING", attemptStatus: "failed", orderStatus: "pending" })).toBe("failed")
  })

  it("settles on SUCCESSFUL + pending", () => {
    expect(evaluateMomoOutcome({ momoStatus: "SUCCESSFUL", attemptStatus: "pending", orderStatus: "pending" })).toBe("settled")
  })

  it("fails on FAILED", () => {
    expect(evaluateMomoOutcome({ momoStatus: "FAILED", attemptStatus: "pending", orderStatus: "pending" })).toBe("failed")
  })

  it("stays pending while MoMo is still PENDING", () => {
    expect(evaluateMomoOutcome({ momoStatus: "PENDING", attemptStatus: "pending", orderStatus: "pending" })).toBe("pending")
  })
})
