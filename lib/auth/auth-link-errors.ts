/**
 * Shared handling for links that arrive from Supabase auth emails (password recovery, email
 * confirmation). Routes redirect with one of these codes; the UI turns them into plain language.
 */

export const RECOVERY_PATH = "/reset-password"

export type AuthLinkErrorCode =
  | "auth_callback_failed"
  | "email_confirmation_failed"
  | "missing_auth_code"
  | "profile_bootstrap_failed"
  | "recovery_link_invalid"

const MESSAGES: Record<AuthLinkErrorCode, string> = {
  auth_callback_failed: "That sign-in link could not be completed. Please log in again.",
  email_confirmation_failed: "That confirmation link is invalid or has expired. Please request a new one.",
  missing_auth_code: "That sign-in link is incomplete. Please log in again.",
  profile_bootstrap_failed: "You are signed in, but we could not load your account. Please try again.",
  recovery_link_invalid:
    "That password reset link is invalid or has expired. Reset links work once and expire after an hour — request a new one below.",
}

export function authLinkErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null
  return (MESSAGES as Record<string, string>)[code] ?? null
}

export function isRecoveryDestination(next: string): boolean {
  return next === RECOVERY_PATH || next.startsWith(`${RECOVERY_PATH}?`)
}

/** Where a failed email link should send the user: recovery failures go back to "forgot password". */
export function failedAuthLinkDestination(next: string, fallbackCode: AuthLinkErrorCode): { pathname: string; error: AuthLinkErrorCode } {
  return isRecoveryDestination(next)
    ? { pathname: "/forgot-password", error: "recovery_link_invalid" }
    : { pathname: "/login", error: fallbackCode }
}
