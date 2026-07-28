import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { clientKey, rateLimit, tooManyRequests } from "@/lib/rate-limit"

describe("rate-limit (no backend = no-op)", () => {
  const saved = {
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    supaUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }

  beforeEach(() => {
    // No Upstash AND no service-role DB client → the fallback must allow.
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })
  afterEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = saved.url
    process.env.UPSTASH_REDIS_REST_TOKEN = saved.token
    process.env.SUPABASE_SERVICE_ROLE_KEY = saved.serviceKey
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved.supaUrl
  })

  it("allows every request when no rate-limit backend is configured", async () => {
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
