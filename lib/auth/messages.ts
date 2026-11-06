/** Plain-language versions of Supabase Auth errors for the login, sign-up and organizer forms. */

export function explainPasswordAuthError(message: string, mode: "login" | "signup"): string {
  const lower = message.toLowerCase()

  if (lower.includes("invalid login credentials")) {
    return "The email or password is incorrect. Check both fields or reset your password."
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email from the link in your inbox before logging in."
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "An account already exists for this email. Log in or reset the password instead."
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Wait a few minutes, then try again."
  }
  if (lower.includes("password")) return message

  return mode === "login"
    ? "We could not log you in. Check your details and try again."
    : "We could not create the account. Check your details and try again."
}

export function explainOtpError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many code requests were made. Wait a few minutes before requesting another code."
  }
  if (lower.includes("expired") || lower.includes("invalid")) {
    return "That code is invalid or has expired. Request a new code and use the latest one from your inbox."
  }
  return message
}

/** Errors from sending an organizer email code (not from checking one). */
export function explainCodeRequestError(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many email code requests were made. Wait a few minutes, then try again."
  }
  return message
}
