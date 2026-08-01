import { describe, expect, it } from "vitest"

import {
  isExpectedSignedOutAuthError,
  isStaleSupabaseRefreshTokenError,
  isSupabaseAuthTokenCookie,
} from "@/lib/supabase/auth-errors"

describe("Supabase auth error classification", () => {
  it("recognizes normal signed-out and stale-refresh-token errors", () => {
    expect(
      isExpectedSignedOutAuthError({
        name: "AuthSessionMissingError",
        message: "Auth session missing!",
      }),
    ).toBe(true)
    expect(
      isStaleSupabaseRefreshTokenError({
        code: "refresh_token_not_found",
        message: "Invalid Refresh Token: Refresh Token Not Found",
      }),
    ).toBe(true)
    expect(
      isStaleSupabaseRefreshTokenError({
        code: "validation_failed",
        message: "Refresh token is not valid",
      }),
    ).toBe(true)
  })

  it("does not hide unexpected authentication failures", () => {
    expect(isExpectedSignedOutAuthError(new Error("Supabase request timed out"))).toBe(false)
  })

  it("matches only Supabase auth-token cookies and their chunks", () => {
    expect(isSupabaseAuthTokenCookie("sb-radsfmlsjznqvcpogluo-auth-token")).toBe(true)
    expect(isSupabaseAuthTokenCookie("sb-radsfmlsjznqvcpogluo-auth-token.0")).toBe(true)
    expect(isSupabaseAuthTokenCookie("sb-radsfmlsjznqvcpogluo-auth-token-code-verifier")).toBe(false)
    expect(isSupabaseAuthTokenCookie("theme")).toBe(false)
  })
})
