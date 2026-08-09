import { describe, expect, it, vi } from "vitest"

import {
  getVerifiedScannerRequestUser,
  type ScannerRequestAuthClient,
} from "@/lib/scanner/request-auth"

function authClient(result: unknown): ScannerRequestAuthClient {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(result),
    },
  }
}

describe("scanner request authentication", () => {
  it("returns a user only after getUser verifies the session", async () => {
    const user = { id: "user-1" }
    const result = await getVerifiedScannerRequestUser(
      authClient({ data: { user }, error: null }),
    )

    expect(result).toEqual({ user, error: null })
  })

  it("treats a missing browser session as a device-auth request", async () => {
    const result = await getVerifiedScannerRequestUser(
      authClient({
        data: { user: null },
        error: { name: "AuthSessionMissingError", message: "Auth session missing!" },
      }),
    )

    expect(result).toEqual({ user: null, error: null })
  })

  it("preserves unexpected auth failures", async () => {
    const error = new Error("Auth service unavailable")
    const result = await getVerifiedScannerRequestUser(
      authClient({ data: { user: null }, error }),
    )

    expect(result).toEqual({ user: null, error })
  })
})
