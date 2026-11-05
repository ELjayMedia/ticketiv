"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import posthog from "posthog-js"

import { loginAction } from "@/app/(auth)/actions"
import { AuthAlert, AuthNote, AuthSteps, AuthSwitchLinks } from "@/components/auth/auth-ui"
import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { INITIAL_AUTH_STATE } from "@/lib/auth/form-state"

interface LoginFormProps {
  /** Same-site path to return to; when absent the server picks the landing page. */
  next?: string | null
  /** Error from an email link (/auth/confirm, /auth/callback). */
  linkError?: string | null
  /** Notice such as "password updated". */
  notice?: string | null
  /** Hide the sign-up / organizer links (admin login). */
  internal?: boolean
}

export function LoginForm({ next, linkError, notice, internal = false }: LoginFormProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(loginAction, INITIAL_AUTH_STATE)
  const done = state.status === "success" && state.redirectTo

  useEffect(() => {
    if (state.status !== "success" || !state.redirectTo) return
    posthog.capture("login_completed")
    // The session cookies arrived with the action response; the destination
    // renders signed in without a further refresh.
    router.replace(state.redirectTo)
  }, [state, router])

  const error = state.status === "error" ? state.message : state.status === "idle" ? linkError : null

  return (
    <div className="flex flex-col gap-6">
      <AuthSteps badge="Account login" steps={["Email + password", "Continue"]} />

      <form action={formAction} className="flex flex-col gap-5">
        {next && <input type="hidden" name="next" value={next} />}
        <FormField
          label="Email address *"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email ?? ""}
          required
        />
        <FormField
          label="Password *"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          autoFocus={state.status === "error"}
        />
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-[12px] font-semibold text-ink underline-offset-4 hover:underline">
            Forgot password?
          </Link>
        </div>

        <AuthNote>Log in directly with your email and password. Ticketiv will not send a login OTP.</AuthNote>

        {state.status === "idle" && notice && <AuthAlert tone="info">{notice}</AuthAlert>}
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <Button type="submit" variant="primary" size="md" disabled={pending || !!done} block>
          {pending || done ? "Logging in…" : "Log in"}
          <Icon name="arrowR" size={14} />
        </Button>
      </form>

      {!internal && <AuthSwitchLinks mode="login" />}
    </div>
  )
}
