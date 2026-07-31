"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import {
  ORGANIZER_SIGNUP_STORAGE_KEY,
  isValidEmail,
  normalizeOrganizerSignup,
  validateOrganizerSignup,
  type OrganizerSignupPayload,
} from "@/lib/auth/organizer-signup"
import { createClient } from "@/lib/supabase/client"

type AuthMode = "login" | "signup"

function explainAuthError(message: string, mode: AuthMode) {
  const lower = message.toLowerCase()

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many email code requests were made. Wait a few minutes, then try again."
  }

  if (lower.includes("not authorized")) {
    return "Supabase refused to send to this email address. Check the project email settings or use an authorized test email."
  }

  if (lower.includes("signup") || lower.includes("signups")) {
    return mode === "signup"
      ? message
      : "We could not find a Ticketiv account for that email. Register as an organizer if this is your first time using Ticketiv."
  }

  return mode === "login"
    ? "We could not send a login code for that email. Check the address and try again."
    : message
}

function getAuthCopy(mode: AuthMode) {
  if (mode === "signup") {
    return {
      badge: "Organizer registration",
      submit: "Send verification code",
      busy: "Sending code…",
      help: "We’ll send a 6-digit code to verify the email before organizer tools are unlocked.",
      note: "Use an email and phone number you control. They will be used for account and event-operation notices.",
      alternate: "Already have a Ticketiv account?",
      alternateCta: "Log in",
      alternateHref: "/login",
    }
  }

  return {
    badge: "Account login",
    submit: "Send login code",
    busy: "Sending code…",
    help: "We’ll send a 6-digit code to the email already linked to your Ticketiv account.",
    note: "Logging in restores existing access only. It will not create an account or grant organizer permissions.",
    alternate: "New organizer?",
    alternateCta: "Register as an organizer",
    alternateHref: "/signup",
  }
}

const emptyOrganizerSignup: OrganizerSignupPayload = {
  firstName: "",
  surname: "",
  phone: "",
  email: "",
  idNumber: "",
}

export function SignInForm({ mode = "login" }: { mode?: AuthMode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [organizer, setOrganizer] = useState<OrganizerSignupPayload>(emptyOrganizerSignup)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = getAuthCopy(mode)
  const signupReady = Boolean(
    organizer.firstName.trim() &&
    organizer.surname.trim() &&
    organizer.phone.trim() &&
    organizer.email.trim(),
  )

  function updateOrganizer(field: keyof OrganizerSignupPayload, value: string) {
    setOrganizer((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const signupPayload = normalizeOrganizerSignup(organizer)
    const normalizedEmail = mode === "signup" ? signupPayload.email : email.trim().toLowerCase()

    if (mode === "signup") {
      const validationError = validateOrganizerSignup(signupPayload)
      if (validationError) {
        setError(validationError)
        return
      }
    } else if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address, for example name@example.com.")
      return
    }

    const supabase = createClient()
    const shouldCreateUser = mode === "signup"
    const requestedRedirect = search?.get("redirectTo") || search?.get("from")
    const redirectTo =
      requestedRedirect && requestedRedirect.startsWith("/") && !requestedRedirect.startsWith("//")
        ? requestedRedirect
        : mode === "signup"
          ? "/onboarding/organizer"
          : undefined

    if (mode === "signup") {
      window.sessionStorage.setItem(
        ORGANIZER_SIGNUP_STORAGE_KEY,
        JSON.stringify(signupPayload),
      )
    }

    setBusy(true)
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser,
        data:
          mode === "signup"
            ? {
                first_name: signupPayload.firstName,
                surname: signupPayload.surname,
                phone: signupPayload.phone,
                signup_intent: "organizer",
              }
            : undefined,
      },
    })
    setBusy(false)

    if (authError) {
      if (mode === "signup") {
        window.sessionStorage.removeItem(ORGANIZER_SIGNUP_STORAGE_KEY)
      }
      setError(explainAuthError(authError.message, mode))
      return
    }

    const params = new URLSearchParams({ to: normalizedEmail, mode })
    if (mode === "signup") params.set("intent", "organizer")
    if (redirectTo) params.set("redirectTo", redirectTo)
    router.push(`/verify?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card flat className="bg-bg">
        <CardBody className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-3">
            {copy.badge}
          </span>
          {mode === "signup" ? (
            <ol className="grid gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 sm:grid-cols-3">
              <li><span className="font-semibold text-ink">1.</span> Your details</li>
              <li><span className="font-semibold text-ink">2.</span> Email code</li>
              <li><span className="font-semibold text-ink">3.</span> Organizer setup</li>
            </ol>
          ) : (
            <ol className="grid gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 sm:grid-cols-3">
              <li><span className="font-semibold text-ink">1.</span> Your email</li>
              <li><span className="font-semibold text-ink">2.</span> Email code</li>
              <li><span className="font-semibold text-ink">3.</span> Continue</li>
            </ol>
          )}
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {mode === "signup" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="First name *"
                autoComplete="given-name"
                placeholder="First name"
                value={organizer.firstName}
                onChange={(e) => updateOrganizer("firstName", e.target.value)}
                required
              />
              <FormField
                label="Surname *"
                autoComplete="family-name"
                placeholder="Surname"
                value={organizer.surname}
                onChange={(e) => updateOrganizer("surname", e.target.value)}
                required
              />
            </div>

            <FormField
              label="Phone number *"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="e.g. +268 7600 0000"
              value={organizer.phone}
              onChange={(e) => updateOrganizer("phone", e.target.value)}
              required
              hint="Include your country code where possible."
            />

            <FormField
              label="Email address *"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={organizer.email}
              onChange={(e) => updateOrganizer("email", e.target.value)}
              required
              hint="The organizer verification code will be sent here."
            />

            <FormField
              label="ID number (optional)"
              autoComplete="off"
              placeholder="National ID or passport number"
              value={organizer.idNumber}
              onChange={(e) => updateOrganizer("idNumber", e.target.value)}
              maxLength={64}
              hint="Optional for now. It is stored privately and can support later payout or identity checks."
            />
          </>
        ) : (
          <FormField
            label="Email address *"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null) }}
            required
            hint="The login code will be sent here."
          />
        )}

        <div className="flex flex-col gap-1.5 text-[12px] leading-5 text-ink-3">
          <p>{copy.help}</p>
          <p>{copy.note}</p>
        </div>

        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
          <Icon name="check" size={14} className="mt-0.5 text-accent" />
          <span>
            {mode === "signup"
              ? "Email verification is required for organizer registration. Attendees do not need to register here to browse or buy tickets."
              : "One email can carry attendee, organizer, staff and talent access. Ticketiv restores only the roles already linked to it."}
          </span>
        </div>

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
            <Icon name="close" size={14} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={busy || (mode === "login" ? !email : !signupReady)}
          block
        >
          {busy ? copy.busy : copy.submit}
          <Icon name="arrowR" size={14} />
        </Button>
      </form>

      <p className="text-center text-[13px] text-ink-3">
        {copy.alternate}{" "}
        <Link href={copy.alternateHref} className="font-semibold text-ink underline-offset-4 hover:underline">
          {copy.alternateCta}
        </Link>
      </p>
    </div>
  )
}
