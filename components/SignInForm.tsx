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

type AuthMode = "login" | "signup" | "organizer"

type AccountSignup = {
  firstName: string
  surname: string
  phone: string
  email: string
  password: string
}

const emptyAccountSignup: AccountSignup = {
  firstName: "",
  surname: "",
  phone: "",
  email: "",
  password: "",
}

const emptyOrganizerSignup: OrganizerSignupPayload = {
  firstName: "",
  surname: "",
  phone: "",
  email: "",
  idNumber: "",
}

function safeRedirect(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback
}

function explainPasswordAuthError(message: string, mode: "login" | "signup") {
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

  if (lower.includes("password")) return message

  return mode === "login"
    ? "We could not log you in. Check your details and try again."
    : "We could not create the account. Check your details and try again."
}

function explainOrganizerError(message: string) {
  const lower = message.toLowerCase()

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many email code requests were made. Wait a few minutes, then try again."
  }

  return message
}

async function bootstrapProfile(
  supabase: ReturnType<typeof createClient>,
  values?: Pick<AccountSignup, "firstName" | "surname" | "phone">,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) throw new Error(userError?.message || "Unable to load your account")

  const displayName = values
    ? `${values.firstName.trim()} ${values.surname.trim()}`.trim()
    : user.user_metadata?.display_name ?? undefined

  const { error } = await supabase.rpc("fn_bootstrap_ticketiv_user", {
    p_user_id: user.id,
    p_email: user.email ?? undefined,
    p_phone: values?.phone.trim() || undefined,
    p_display_name: displayName,
  })

  if (error) throw new Error(error.message)
}

export function SignInForm({ mode = "login" }: { mode?: AuthMode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [account, setAccount] = useState<AccountSignup>(emptyAccountSignup)
  const [organizer, setOrganizer] = useState<OrganizerSignupPayload>(emptyOrganizerSignup)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const organizerReady = Boolean(
    organizer.firstName.trim() && organizer.surname.trim() && organizer.phone.trim() && organizer.email.trim(),
  )
  const signupReady = Boolean(
    account.firstName.trim() &&
      account.surname.trim() &&
      account.phone.trim() &&
      account.email.trim() &&
      account.password.length >= 8,
  )

  function updateAccount(field: keyof AccountSignup, value: string) {
    setAccount((current) => ({ ...current, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  function updateOrganizer(field: keyof OrganizerSignupPayload, value: string) {
    setOrganizer((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const supabase = createClient()

    if (mode === "organizer") {
      const signupPayload = normalizeOrganizerSignup(organizer)
      const validationError = validateOrganizerSignup(signupPayload)
      if (validationError) {
        setError(validationError)
        return
      }

      window.sessionStorage.setItem(ORGANIZER_SIGNUP_STORAGE_KEY, JSON.stringify(signupPayload))
      setBusy(true)
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: signupPayload.email,
        options: {
          shouldCreateUser: true,
          data: {
            first_name: signupPayload.firstName,
            surname: signupPayload.surname,
            phone: signupPayload.phone,
            signup_intent: "organizer",
          },
        },
      })
      setBusy(false)

      if (authError) {
        window.sessionStorage.removeItem(ORGANIZER_SIGNUP_STORAGE_KEY)
        setError(explainOrganizerError(authError.message))
        return
      }

      const params = new URLSearchParams({
        to: signupPayload.email,
        intent: "organizer",
        redirectTo: "/onboarding/organizer",
      })
      router.push(`/verify?${params.toString()}`)
      return
    }

    if (mode === "login") {
      const normalizedEmail = email.trim().toLowerCase()
      if (!isValidEmail(normalizedEmail)) {
        setError("Enter a valid email address, for example name@example.com.")
        return
      }
      if (!password) {
        setError("Enter your password.")
        return
      }

      setBusy(true)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (authError) {
        setBusy(false)
        setError(explainPasswordAuthError(authError.message, "login"))
        return
      }

      try {
        await bootstrapProfile(supabase)
      } catch (profileError) {
        setBusy(false)
        setError(profileError instanceof Error ? profileError.message : "Unable to load your Ticketiv profile")
        return
      }

      setBusy(false)
      const redirectTo = safeRedirect(search?.get("redirectTo") || search?.get("from"), "/")
      router.push(redirectTo as "/")
      router.refresh()
      return
    }

    const normalizedEmail = account.email.trim().toLowerCase()
    if (!account.firstName.trim() || !account.surname.trim() || !account.phone.trim()) {
      setError("First name, surname and phone number are required.")
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address, for example name@example.com.")
      return
    }
    if (account.password.length < 8) {
      setError("Use a password with at least 8 characters.")
      return
    }

    setBusy(true)
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=/`
    const { data, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: account.password,
      options: {
        emailRedirectTo,
        data: {
          first_name: account.firstName.trim(),
          surname: account.surname.trim(),
          phone: account.phone.trim(),
          display_name: `${account.firstName.trim()} ${account.surname.trim()}`,
          signup_intent: "account",
        },
      },
    })

    if (authError) {
      setBusy(false)
      setError(explainPasswordAuthError(authError.message, "signup"))
      return
    }

    if (!data.session) {
      setBusy(false)
      setSuccess("Account created. Check your email for the confirmation link, then log in with your password.")
      return
    }

    try {
      await bootstrapProfile(supabase, account)
    } catch (profileError) {
      setBusy(false)
      setError(profileError instanceof Error ? profileError.message : "Unable to set up your Ticketiv profile")
      return
    }

    setBusy(false)
    router.push("/")
    router.refresh()
  }

  const isOrganizer = mode === "organizer"
  const isSignup = mode === "signup"

  return (
    <div className="flex flex-col gap-6">
      <Card flat className="bg-bg">
        <CardBody className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-3">
            {isOrganizer ? "Organizer registration" : isSignup ? "Create account" : "Account login"}
          </span>
          <ol className={`grid gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 ${isOrganizer ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
            {isOrganizer ? (
              <>
                <li><span className="font-semibold text-ink">1.</span> Your details</li>
                <li><span className="font-semibold text-ink">2.</span> Email code</li>
                <li><span className="font-semibold text-ink">3.</span> Organizer setup</li>
              </>
            ) : (
              <>
                <li><span className="font-semibold text-ink">1.</span> {isSignup ? "Your details" : "Email + password"}</li>
                <li><span className="font-semibold text-ink">2.</span> {isSignup ? "Create account" : "Continue"}</li>
              </>
            )}
          </ol>
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {isOrganizer && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name *" autoComplete="given-name" placeholder="First name" value={organizer.firstName} onChange={(e) => updateOrganizer("firstName", e.target.value)} required />
              <FormField label="Surname *" autoComplete="family-name" placeholder="Surname" value={organizer.surname} onChange={(e) => updateOrganizer("surname", e.target.value)} required />
            </div>
            <FormField label="Phone number *" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +268 7600 0000" value={organizer.phone} onChange={(e) => updateOrganizer("phone", e.target.value)} required hint="Include your country code where possible." />
            <FormField label="Email address *" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={organizer.email} onChange={(e) => updateOrganizer("email", e.target.value)} required hint="The organizer verification code will be sent here." />
            <FormField label="ID number (optional)" autoComplete="off" placeholder="National ID or passport number" value={organizer.idNumber} onChange={(e) => updateOrganizer("idNumber", e.target.value)} maxLength={64} hint="Optional for now. It is stored privately for later identity or payout checks." />
          </>
        )}

        {isSignup && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First name *" autoComplete="given-name" placeholder="First name" value={account.firstName} onChange={(e) => updateAccount("firstName", e.target.value)} required />
              <FormField label="Surname *" autoComplete="family-name" placeholder="Surname" value={account.surname} onChange={(e) => updateAccount("surname", e.target.value)} required />
            </div>
            <FormField label="Phone number *" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +268 7600 0000" value={account.phone} onChange={(e) => updateAccount("phone", e.target.value)} required />
            <FormField label="Email address *" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={account.email} onChange={(e) => updateAccount("email", e.target.value)} required />
            <FormField label="Password *" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={account.password} onChange={(e) => updateAccount("password", e.target.value)} minLength={8} required hint="You will use this password to log in. No OTP is required." />
          </>
        )}

        {mode === "login" && (
          <>
            <FormField label="Email address *" type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setError(null) }} required />
            <FormField label="Password *" type="password" autoComplete="current-password" placeholder="Your password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null) }} required />
            <div className="-mt-2 text-right">
              <Link href="/forgot-password" className="text-[12px] font-semibold text-ink underline-offset-4 hover:underline">Forgot password?</Link>
            </div>
          </>
        )}

        <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
          <Icon name="check" size={14} className="mt-0.5 text-accent" />
          <span>
            {isOrganizer
              ? "Organizer registration is the only Ticketiv flow that uses a 6-digit email OTP."
              : isSignup
                ? "Create your account with a password. Ticketiv will not ask for an OTP during sign-up."
                : "Log in directly with your email and password. Ticketiv will not send a login OTP."}
          </span>
        </div>

        {success && <div className="rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">{success}</div>}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
            <Icon name="close" size={14} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" variant="primary" size="md" disabled={busy || (isOrganizer ? !organizerReady : isSignup ? !signupReady : !email || !password)} block>
          {busy ? (isOrganizer ? "Sending code…" : isSignup ? "Creating account…" : "Logging in…") : isOrganizer ? "Send organizer verification code" : isSignup ? "Create account" : "Log in"}
          <Icon name="arrowR" size={14} />
        </Button>
      </form>

      <div className="space-y-2 text-center text-[13px] text-ink-3">
        <p>
          {isOrganizer ? "Already have a Ticketiv account?" : isSignup ? "Already have an account?" : "Need a Ticketiv account?"}{" "}
          <Link href={isOrganizer || isSignup ? "/login" : "/signup"} className="font-semibold text-ink underline-offset-4 hover:underline">
            {isOrganizer || isSignup ? "Log in" : "Sign up"}
          </Link>
        </p>
        {!isOrganizer && (
          <p>
            Planning to host an event?{" "}
            <Link href="/organizer/register" className="font-semibold text-ink underline-offset-4 hover:underline">Register as an organizer</Link>
          </p>
        )}
      </div>
    </div>
  )
}
