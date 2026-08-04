import { describe, expect, it, vi } from "vitest"

import { ensureCheckoutIdentity } from "@/lib/auth/checkout-identity"

describe("ensureCheckoutIdentity", () => {
  it("reuses an authenticated buyer from the supplied client", async () => {
    const signInAnonymously = vi.fn()
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "buyer-1",
              email: "buyer@example.com",
              is_anonymous: false,
            },
          },
        }),
        signInAnonymously,
      },
    }

    await expect(ensureCheckoutIdentity(client as any)).resolves.toEqual({
      userId: "buyer-1",
      email: "buyer@example.com",
      isAnonymous: false,
    })
    expect(signInAnonymously).not.toHaveBeenCalled()
  })

  it("mints and returns an anonymous buyer on the supplied client", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        signInAnonymously: vi.fn().mockResolvedValue({
          data: { user: { id: "guest-1" } },
          error: null,
        }),
      },
    }

    await expect(ensureCheckoutIdentity(client as any)).resolves.toEqual({
      userId: "guest-1",
      email: null,
      isAnonymous: true,
    })
    expect(client.auth.signInAnonymously).toHaveBeenCalledOnce()
  })

  it("returns null when anonymous sign-in is unavailable", async () => {
    const error = new Error("Anonymous sign-ins disabled")
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        signInAnonymously: vi.fn().mockResolvedValue({
          data: { user: null },
          error,
        }),
      },
    }
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

    await expect(ensureCheckoutIdentity(client as any)).resolves.toBeNull()
    expect(errorSpy).toHaveBeenCalledWith("[checkout-identity] anonymous sign-in failed", error)
    errorSpy.mockRestore()
  })
})
