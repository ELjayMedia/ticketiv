"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

import { Button } from "@/components/quiet/ui/button"
import { Card, CardBody } from "@/components/quiet/ui/card"
import { FormField } from "@/components/quiet/ui/form"
import { Icon } from "@/components/quiet/ui/icon"
import { createClient } from "@/lib/supabase/client"

type AuthMode = "login" | "signup"

const ROLE_CARDS = [
  {
    label: "Attendee",
    description: "Buy tickets, save events and manage your QR tickets.",
  },
  {
    label: "Organizer",
    description: "Unlocked when this email is linked to an organiser or event owner record.",
  },
  {
    label: "Scanner",
    description: "Unlocked when this user is added to event staff for access control.",
  },
  {
    label: "Talent",
    description: "Unlocked when this user is connected to an artist, speaker or performer profile.",
  },
]

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

function explainAuthError(message: string, mode: AuthMode) {
  const lower = message.toLowerCase()

  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many email code requests were made. Wait a few minutes, then try again."
  }

  if (lower.includes("not authorized")) {
    return "Supabase refused to send to this email address. Check the project email settings or use an authorized test email."
  }

  if (lower.includes("signup") || lower.includes("signups")) {
    return mode === "signup" ? message : "We could not find that Ticketiv account. Create an account first, then log in."
  }

  return mode === "login" ? "We could not send a code for that email. Create an account first, then log in." : message
}

function getAuthCopy(mode: AuthMode) {
  if (mode === "signup") {
    return {
      badge: "Step 1 of 2",
      submit: "Send my code",
      busy: "Sending code…",
      help: "Enter your email and we’ll send a 6-digit code. Once verified, your Ticketiv ID is created as an Attendee first.",
      note: "Use an email you can access now. The code expires, and repeated requests may trigger Supabase rate limits.",
      alternate: "Already have a Ticketiv ID?",
      alternateCta: "Log in",
      alternateHref: "/login",
    }
  }

  return {
    badge: "Secure login",
    submit: "Send login code",
    busy: "Sending code…",
    help: "Use the same email address linked to your Ticketiv ID. We’ll send a 6-digit login code.",
    note: "Do not request multiple codes at once. Use the most recent code in your inbox.",
    alternate: "New to Ticketiv?",
    alternateCta: "Create an account",
    alternateHref: "/signup",
  }
}

export function SignInForm({ mode = "login" }: { mode?: AuthMode }) {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = getAuthCopy(mode)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError("Enter a valid email address, for example name@example.com.")
      return
    }

    const supabase = createClient()
    const shouldCreateUser = mode === "signup"
    const redirectTo = search.get("redirectTo") || search.get("from")

    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: { shouldCreateUser },
    })
    setBusy(false)

    if (error) {
      setError(explainAuthError(error.message, mode))
      return
    }

    const params = new URLSearchParams({ to: normalizedEmail, mode })
    if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
      params.set("redirectTo", redirectTo)
    }
    router.push(`/verify?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card flat className="bg-bg">
        <CardBody className="flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-ink-3">
            {copy.badge}
          </span>
          <ol className="grid gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3 sm:grid-cols-3">
            <li><span className="font-semibold text-ink">1.</span> Enter email</li>
            <li><span className="font-semibold text-ink">2.</span> Get code</li>
            <li><span className="font-semibold text-ink">3.</span> Verify ID</li>
          </ol>
        </CardBody>
      </Card>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <FormField
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null) }}
          required
          hint="We’ll send a 6-digit code to this inbox."
        />

        <div className="flex flex-col gap-1.5 text-[12px] leading-5 text-ink-3">
          <p>{copy.help}</p>
          <p>{copy.note}</p>
        </div>

        {mode === "signup" && (
          <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-line bg-bg px-3 py-2.5 text-[12px] text-ink-2">
            <Icon name="check" size={14} className="mt-0.5 text-accent" />
            <span>No password needed for now. Your email becomes the first identity attached to your Ticketiv profile.</span>
          </div>
        )}

        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-[var(--radius-md)] border border-danger/30 bg-danger-soft px-3 py-2.5 text-[12px] text-danger">
            <Icon name="close" size={14} className="mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" variant="primary" size="md" disabled={busy || !email} block>
          {busy ? copy.busy : copy.submit}
          <Icon name="arrowR" size={14} />
        </Button>
      </form>

      {mode === "signup" && (
        <Card flat className="bg-bg">
          <CardBody className="flex flex-col gap-3">
            <p className="text-h3">What your Ticketiv ID can unlock</p>
            <div className="grid gap-2">
              {ROLE_CARDS.map((role) => (
                <div key={role.label} className="rounded-[var(--radius-md)] border border-line bg-surface p-3">
                  <p className="text-[13px] font-semibold text-ink">{role.label}</p>
                  <p className="text-[12px] text-ink-3">{role.description}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <p className="text-center text-[13px] text-ink-3">
        {copy.alternate}{" "}
        <Link href={copy.alternateHref} className="font-semibold text-ink underline-offset-4 hover:underline">
          {copy.alternateCta}
        </Link>
      </p>
    </div>
  )
}
