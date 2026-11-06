"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import posthog from "posthog-js"

import { signupAction } from "@/app/(auth)/actions"
import { AuthAlert, AuthNote, AuthSteps, AuthSwitchLinks } from "@/components/auth/auth-ui"
import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { INITIAL_AUTH_STATE } from "@/lib/auth/form-state"

export function SignupForm({ next }: { next?: string | null }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(signupAction, INITIAL_AUTH_STATE)
  const done = state.status === "success" && state.redirectTo
  const v = state.values ?? {}

  useEffect(() => {
    if (state.status !== "success" || !state.redirectTo) return
    posthog.capture("account_signup_completed")
    router.replace(state.redirectTo)
  }, [state, router])

  if (state.status === "check-email") {
    return (
      <div className="flex flex-col gap-6">
        <AuthAlert tone="info">{state.message}</AuthAlert>
        <AuthSwitchLinks mode="signup" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthSteps badge="Create account" steps={["Your details", "Create account"]} />

      <form action={formAction} className="flex flex-col gap-5">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name *" name="firstName" autoComplete="given-name" placeholder="First name" defaultValue={v.firstName ?? ""} maxLength={100} required />
          <FormField label="Surname *" name="surname" autoComplete="family-name" placeholder="Surname" defaultValue={v.surname ?? ""} maxLength={100} required />
        </div>
        <FormField label="Phone number *" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +268 7600 0000" defaultValue={v.phone ?? ""} required />
        <FormField label="Email address *" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" defaultValue={v.email ?? ""} required />
        <FormField
          label="Password *"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          hint="You will use this password to log in. No OTP is required."
        />

        <AuthNote>Create your account with a password. Ticketiv will not ask for an OTP during sign-up.</AuthNote>

        {state.status === "error" && <AuthAlert tone="error">{state.message}</AuthAlert>}

        <Button type="submit" variant="primary" size="md" disabled={pending || !!done} block>
          {pending || done ? "Creating account…" : "Create account"}
          <Icon name="arrowR" size={14} />
        </Button>
      </form>

      <AuthSwitchLinks mode="signup" />
    </div>
  )
}
