import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  noStore: vi.fn(),
}))

vi.mock("next/cache", () => ({
  unstable_noStore: mocks.noStore,
}))

vi.mock("@/lib/supabase-server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock("@/lib/data/admin", () => ({
  isUserAdmin: vi.fn(),
}))

import { getCurrentUserProfile } from "@/lib/auth"

describe("getCurrentUserProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("treats a missing session as a normal signed-out state", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    mocks.createServerSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
        }),
      },
    })

    await expect(getCurrentUserProfile()).resolves.toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it("treats a thrown stale refresh token as a normal signed-out state", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    mocks.createServerSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockRejectedValue({
          name: "AuthApiError",
          code: "refresh_token_not_found",
          message: "Invalid Refresh Token: Refresh Token Not Found",
        }),
      },
    })

    await expect(getCurrentUserProfile()).resolves.toBeNull()
    expect(errorSpy).not.toHaveBeenCalled()

    errorSpy.mockRestore()
  })

  it("continues to log unexpected authentication failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const userError = { name: "AuthApiError", message: "Auth service unavailable" }
    mocks.createServerSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: userError }),
      },
    })

    await expect(getCurrentUserProfile()).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith("[auth] getUser error:", userError)

    errorSpy.mockRestore()
  })

  it("requests only profile columns granted to authenticated users", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        user_id: "user-1",
        display_name: "Test Organizer",
        name: "Test",
        surname: "Organizer",
        avatar_url: null,
        created_at: "2026-11-12T00:00:00Z",
      },
      error: null,
    })
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mocks.createServerSupabaseClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "organizer@example.test",
              phone: "+26800000000",
            },
          },
          error: null,
        }),
      },
      from,
    })

    await expect(getCurrentUserProfile()).resolves.toMatchObject({
      profile: {
        id: "user-1",
        full_name: "Test Organizer",
        phone: "+26800000000",
      },
    })
    expect(from).toHaveBeenCalledWith("profiles")
    expect(select).toHaveBeenCalledWith(
      "user_id, display_name, name, surname, avatar_url, created_at",
    )
  })
})
