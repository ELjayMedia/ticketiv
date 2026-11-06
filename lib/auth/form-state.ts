export interface AuthFormState {
  status: "idle" | "error" | "success" | "check-email"
  message?: string
  /** Where the browser should go next (status "success"). */
  redirectTo?: string
  /** Echoed back so a failed submit keeps what the user typed (never the password). */
  values?: Record<string, string>
}

export const INITIAL_AUTH_STATE: AuthFormState = { status: "idle" }
