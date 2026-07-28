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

  // APP_URL now derives from getTicketivPublicOrigin(), whose documented default
  // is the canonical public origin rather than localhost (see
  // lib/__tests__/public-url.test.ts). An unusable value must still not be
  // trusted verbatim — that is what this asserts.
  it("falls back to the canonical public origin when the configured app URL is invalid", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "mailto:support@ticketiv.app"

    const { APP_URL } = await import("@/lib/env")

    expect(APP_URL).toBe("https://ticketiv.app")
  })
})
