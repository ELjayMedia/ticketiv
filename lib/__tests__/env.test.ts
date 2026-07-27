import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

describe("env APP_URL", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  })

  it("normalizes a host-only configured app URL to an https origin", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "ticketiv.app"

    const { APP_URL } = await import("@/lib/env")

    expect(APP_URL).toBe("https://ticketiv.app")
  })

  it("falls back to localhost when the configured app URL is invalid", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "mailto:support@ticketiv.app"

    const { APP_URL } = await import("@/lib/env")

    expect(APP_URL).toBe("http://localhost:3000")
  })
})
