import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ signOut: vi.fn() }))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: mocks.signOut } }),
}))

import { POST } from "@/app/api/sign-out/route"

function logoutRequest(publicHost?: string) {
  return new NextRequest("https://0.0.0.0:3000/api/sign-out", {
    method: "POST",
    headers: publicHost
      ? {
          host: publicHost,
          "x-forwarded-host": publicHost,
          "x-forwarded-proto": "https",
        }
      : undefined,
  })
}

describe("POST /api/sign-out", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.signOut.mockResolvedValue({ error: null })
  })

  it.each(["uat.ticketiv.app", "ticketiv.app", "www.ticketiv.app"])(
    "invalidates the session and lets %s resolve a relative login redirect",
    async (publicHost) => {
      const response = await POST(logoutRequest(publicHost))

      expect(mocks.signOut).toHaveBeenCalledOnce()
      expect(response.status).toBe(303)
      expect(response.headers.get("location")).toBe("/login")
    },
  )

  it("never exposes an internal bind address when forwarded headers are absent or untrusted", async () => {
    const response = await POST(logoutRequest())
    const location = response.headers.get("location") ?? ""

    expect(location).toBe("/login")
    expect(location).not.toMatch(/0\.0\.0\.0|localhost|127\.0\.0\.1|:\/\/|:3000/i)
  })
})
