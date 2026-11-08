import { describe, expect, it } from "vitest"

import { hasSharedSecret, isAuthorizedCronRequest, secretMatches } from "@/lib/cron-auth"

const req = (headers: Record<string, string>) => new Request("https://ticketiv.app/api/cron/x", { headers })

describe("secretMatches", () => {
  it("matches only the exact value", () => {
    expect(secretMatches("abc123", "abc123")).toBe(true)
    expect(secretMatches("abc12", "abc123")).toBe(false)
    expect(secretMatches("abc1234", "abc123")).toBe(false)
  })

  it("never matches a missing or empty expected value", () => {
    expect(secretMatches("", "")).toBe(false)
    expect(secretMatches("x", undefined)).toBe(false)
    expect(secretMatches(null, "x")).toBe(false)
  })
})

describe("isAuthorizedCronRequest", () => {
  it("accepts the bearer secret", () => {
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer s3cret" }), "s3cret")).toBe(true)
  })

  it("rejects a wrong, missing or bare secret", () => {
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer nope" }), "s3cret")).toBe(false)
    expect(isAuthorizedCronRequest(req({}), "s3cret")).toBe(false)
    expect(isAuthorizedCronRequest(req({ authorization: "s3cret" }), "s3cret")).toBe(false)
  })

  it("rejects everything when no secret is configured", () => {
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer " }), "")).toBe(false)
    expect(isAuthorizedCronRequest(req({ authorization: "Bearer undefined" }), undefined)).toBe(false)
  })
})

describe("hasSharedSecret", () => {
  it("accepts the bearer form or the dedicated header", () => {
    expect(hasSharedSecret(req({ authorization: "Bearer k" }), "k", "x-key")).toBe(true)
    expect(hasSharedSecret(req({ "x-key": "k" }), "k", "x-key")).toBe(true)
  })

  it("rejects wrong values and unconfigured secrets", () => {
    expect(hasSharedSecret(req({ "x-key": "j" }), "k", "x-key")).toBe(false)
    expect(hasSharedSecret(req({ "x-key": "" }), undefined, "x-key")).toBe(false)
  })
})
