"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import posthog from "posthog-js"

import { AuthAlert, AuthNote, AuthSteps, AuthSwitchLinks } from "@/components/auth/auth-ui"
import { Button } from "@/components/quiet/ui/button"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { explainCodeRequestError } from "@/lib/auth/messages"
import {
  normalizeOrganizerSignup,
  validateOrganizerSignup,
  type OrganizerSignupPayload,
} from "@/lib/auth/organizer-signup"
import { clearOrganizerSignup, requestOrganizerCode, saveOrganizerSignup } from "@/lib/auth/organizer-signup-client"
import { createClient } from "@/lib/supabase/client"

const EMPTY: OrganizerSignupPayload = { firstName: "", surname: "", phone: "", email: "", idNumber: "" }

/** Step 1 of organizer registration: details, then a six-digit code to the email. */
export function OrganizerDetailsForm() {
  const router = useRouter()
  const [values, setValues] = useState<OrganizerSignupPayload>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = Boolean(values.firstName.trim() && values.surname.trim() && values.phone.trim() && values.email.trim())

  function update(field: keyof OrganizerSignupPayload, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const signup = normalizeOrganizerSignup(values)
    const invalid = validateOrganizerSignup(signup)
    if (invalid) return setError(invalid)

    setBusy(true)
    const supabase = createClient()
    // Read locally (no network): signed-in users keep their password and skip set-password.
    const {
      data: { session },
    } = await supabase.auth.getSession()
    saveOrganizerSignup(signup, Boolean(session?.user))

    const authError = await requestOrganizerCode(supabase, signup)
    if (authError) {
      clearOrganizerSignup()
      setBusy(false)
      return setError(explainCodeRequestError(authError.message))
    }

    posthog.capture("organizer_verification_requested")
    router.push(`/verify?${new URLSearchParams({ to: signup.email, intent: "organizer", redirectTo: "/onboarding/organizer" })}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <AuthSteps badge="Organizer registration" steps={["Your details", "Email code", "Organizer setup"]} />

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="First name *" autoComplete="given-name" placeholder="First name" value={values.firstName} onChange={(e) => update("firstName", e.target.value)} required />
          <FormField label="Surname *" autoComplete="family-name" placeholder="Surname" value={values.surname} onChange={(e) => update("surname", e.target.value)} required />
        </div>
        <FormField label="Phone number *" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +268 7600 0000" value={values.phone} onChange={(e) => update("phone", e.target.value)} required hint="Include your country code where possible." />
        <FormField label="Email address *" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={values.email} onChange={(e) => update("email", e.target.value)} required hint="The organizer verification code will be sent here." />
        <FormField label="ID number (optional)" autoComplete="off" placeholder="National ID or passport number" value={values.idNumber} onChange={(e) => update("idNumber", e.target.value)} maxLength={64} hint="Optional for now. It is stored privately for later identity or payout checks." />

        <AuthNote>Organizer registration is the only Ticketiv flow that uses a 6-digit email OTP.</AuthNote>
        {error && <AuthAlert tone="error">{error}</AuthAlert>}

        <Button type="submit" variant="primary" size="md" disabled={busy || !ready} block>
          {busy ? "Sending code…" : "Send organizer verification code"}
          <Icon name="arrowR" size={14} />
        </Button>
      </form>

      <AuthSwitchLinks mode="organizer" />
    </div>
  )
}
