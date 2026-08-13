import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}))

import { updateSession } from "@/lib/supabase/middleware"

describe("Supabase middleware session recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("clears stale auth cookies and redirects protected navigation to login", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue({
          name: "AuthApiError",
          code: "refresh_token_not_found",
          message: "Invalid Refresh Token: Refresh Token Not Found",
        }),
      },
    })
    const request = new NextRequest("https://ticketiv.app/profile", {
      headers: {
        cookie:
          "sb-radsfmlsjznqvcpogluo-auth-token.0=stale-a; sb-radsfmlsjznqvcpogluo-auth-token.1=stale-b; theme=dark",
      },
    })

    const response = await updateSession(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://ticketiv.app/login?from=%2Fprofile")
    expect(response.cookies.get("sb-radsfmlsjznqvcpogluo-auth-token.0")?.value).toBe("")
    expect(response.cookies.get("sb-radsfmlsjznqvcpogluo-auth-token.1")?.value).toBe("")
    expect(response.cookies.get("theme")).toBeUndefined()
  })

  it("clears stale auth cookies when getUser returns an error result", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: {
            name: "AuthApiError",
            code: "refresh_token_not_found",
            message: "Invalid Refresh Token: Refresh Token Not Found",
          },
        }),
      },
    })
    const request = new NextRequest("https://ticketiv.app/orgs/org-1/dashboard", {
      headers: {
        cookie: "sb-radsfmlsjznqvcpogluo-auth-token=stale",
      },
    })

    const response = await updateSession(request)

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe(
      "https://ticketiv.app/login?from=%2Forgs%2Forg-1%2Fdashboard",
    )
    expect(response.cookies.get("sb-radsfmlsjznqvcpogluo-auth-token")?.value).toBe("")
  })

  it("redirects signed-out super-admin navigation to the dedicated admin login", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })

    const response = await updateSession(
      new NextRequest("https://ticketiv.app/super-admin/pricing"),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get("location")).toBe("https://ticketiv.app/super-admin/login")
  })

  it("keeps the dedicated super-admin login public", async () => {
    const response = await updateSession(
      new NextRequest("https://ticketiv.app/super-admin/login"),
    )

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it("does not treat similarly named attendee routes as super-admin routes", async () => {
    mocks.createServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })

    const response = await updateSession(
      new NextRequest("https://ticketiv.app/super-administrator"),
    )

    expect(response.headers.get("location")).toBe(
      "https://ticketiv.app/login?from=%2Fsuper-administrator",
    )
  })

  it("keeps unexpected middleware failures visible", async () => {
    const error = new Error("Auth service unavailable")
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    mocks.createServerClient.mockReturnValue({
      auth: { getUser: vi.fn().mockRejectedValue(error) },
    })

    const response = await updateSession(new NextRequest("https://ticketiv.app/profile"))

    expect(response.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith("[middleware] error:", error)
  })

  it("does not initialize auth for public event routes", async () => {
    const response = await updateSession(new NextRequest("https://ticketiv.app/events/launch-night"))

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it("does not initialize auth for the public discovery API", async () => {
    const response = await updateSession(
      new NextRequest("https://ticketiv.app/api/discover/events?limit=24"),
    )

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it("lets capability-verified native ticket delivery reach its route handler", async () => {
    const response = await updateSession(
      new NextRequest("https://ticketiv.app/api/mobile/tickets/signed-token"),
    )

    expect(response.status).toBe(200)
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it("lets the payout API return its own JSON authentication error", async () => {
    const response = await updateSession(
      new NextRequest("https://ticketiv.app/api/payouts", { method: "POST" }),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })

  it.each([
    "/api/scanner/manifest?eventId=event-1&deviceId=device-1&sessionId=session-1",
    "/api/scanner/scans?eventId=event-1&deviceId=device-1&sessionId=session-1",
    "/api/scanner/session",
    "/api/scanner/sync",
    "/api/scanner/validate",
  ])("lets the scanner route authenticate its own device request: %s", async (url) => {
    const response = await updateSession(new NextRequest(`https://ticketiv.app${url}`))

    expect(response.status).toBe(200)
    expect(response.headers.get("location")).toBeNull()
    expect(mocks.createServerClient).not.toHaveBeenCalled()
  })
})
