type AuthErrorLike = {
  code?: unknown
  message?: unknown
  name?: unknown
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

export function isStaleSupabaseRefreshTokenError(error: unknown): boolean {
  const authError = (error ?? {}) as AuthErrorLike
  const code = stringValue(authError.code).toLowerCase()
  const message = stringValue(authError.message).toLowerCase()

  return code === "refresh_token_not_found" || message.includes("invalid refresh token")
}

export function isExpectedSignedOutAuthError(error: unknown): boolean {
  const authError = (error ?? {}) as AuthErrorLike
  const name = stringValue(authError.name)
  const message = stringValue(authError.message).toLowerCase()

  return (
    name === "AuthSessionMissingError" ||
    message.includes("auth session missing") ||
    isStaleSupabaseRefreshTokenError(error)
  )
}

export function isSupabaseAuthTokenCookie(name: string): boolean {
  return name.startsWith("sb-") && /-auth-token(?:\.\d+)?$/.test(name)
}
