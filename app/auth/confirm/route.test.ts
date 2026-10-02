import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      verifyOtp: mocks.verifyOtp,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
    rpc: mocks.rpc,
  }),
}))

import { GET as confirm } from "@/app/auth/confirm/route"
import { GET as callback } from "@/app/auth/callback/route"

function location(response: Response) {
  const url = new URL(response.headers.get("location") ?? "")
  return `${url.pathname}${url.search}`
}

describe("password recovery email links", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@b.co", user_metadata: {} } }, error: null })
    mocks.rpc.mockResolvedValue({ error: null })
  })

  it("verifies a token_hash recovery link server-side and opens the reset page (any device)", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    const response = await confirm(
      new NextRequest("https://ticketiv.app/auth/confirm?token_hash=abc&type=recovery&next=/reset-password"),
    )
    expect(mocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "abc", type: "recovery" })
    expect(location(response)).toBe("/reset-password")
  })

  it("accepts a PKCE code on /auth/confirm for links from the default email template", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null })
    const response = await confirm(new NextRequest("https://ticketiv.app/auth/confirm?code=xyz&next=/reset-password"))
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("xyz")
    expect(location(response)).toBe("/reset-password")
  })

  it("sends an invalid or expired recovery link back to forgot-password with a clear reason", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid" } })
    const response = await confirm(
      new NextRequest("https://ticketiv.app/auth/confirm?token_hash=old&type=recovery&next=/reset-password"),
    )
    expect(location(response)).toBe("/forgot-password?error=recovery_link_invalid")
  })

  it("does not block a password reset when profile bootstrap fails", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    mocks.rpc.mockResolvedValue({ error: { message: "bootstrap failed" } })
    const response = await confirm(
      new NextRequest("https://ticketiv.app/auth/confirm?token_hash=abc&type=recovery&next=/reset-password"),
    )
    expect(location(response)).toBe("/reset-password")
  })

  it("keeps the login error for non-recovery confirmation failures", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: { message: "invalid" } })
    const response = await confirm(new NextRequest("https://ticketiv.app/auth/confirm?token_hash=x&type=signup&next=/"))
    expect(location(response)).toBe("/login?error=email_confirmation_failed")
  })

  it("routes a cross-browser PKCE failure on /auth/callback to forgot-password for recovery", async () => {
    mocks.exchangeCodeForSession.mockResolvedValue({ error: { message: "code verifier not found" } })
    const response = await callback(new NextRequest("https://ticketiv.app/auth/callback?code=xyz&next=/reset-password"))
    expect(location(response)).toBe("/forgot-password?error=recovery_link_invalid")
  })

  it("never redirects off-site through next", async () => {
    mocks.verifyOtp.mockResolvedValue({ error: null })
    const response = await confirm(
      new NextRequest("https://ticketiv.app/auth/confirm?token_hash=abc&type=recovery&next=//evil.example"),
    )
    expect(new URL(response.headers.get("location") ?? "").host).toBe("ticketiv.app")
  })
})
