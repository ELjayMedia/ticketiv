import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

describe("rate-limit (unconfigured = no-op)", () => {
  const saved = { url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }

  beforeEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = saved.url
    process.env.UPSTASH_REDIS_REST_TOKEN = saved.token
  })

  it("allows every request when Upstash env is absent", async () => {
    const r = await rateLimit("test", "ip:1.2.3.4", 1, 60)
    expect(r.allowed).toBe(true)
    const r2 = await rateLimit("test", "ip:1.2.3.4", 1, 60)
    expect(r2.allowed).toBe(true) // no backend = never throttled
  })
})

describe("clientKey", () => {
  it("prefers the authenticated user id", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "9.9.9.9" } })
    expect(clientKey(req, "user-42")).toBe("u:user-42")
  })

  it("falls back to the first forwarded IP", () => {
    const req = new Request("https://x.test", { headers: { "x-forwarded-for": "1.1.1.1, 2.2.2.2" } })
    expect(clientKey(req)).toBe("ip:1.1.1.1")
  })

  it("uses 'unknown' when no IP header is present", () => {
    expect(clientKey(new Request("https://x.test"))).toBe("ip:unknown")
  })
})

describe("tooManyRequests", () => {
  it("returns 429 with Retry-After and limit headers", async () => {
    const res = tooManyRequests({ allowed: false, limit: 10, remaining: 0, retryAfter: 30 })
    expect(res.status).toBe(429)
    expect(res.headers.get("Retry-After")).toBe("30")
    expect(res.headers.get("X-RateLimit-Limit")).toBe("10")
  })
})
