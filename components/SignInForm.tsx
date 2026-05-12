"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, CheckCircle2, Mail } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type AuthMode = "login" | "signup"

const ROLE_CARDS = [
  {
    label: "Attendee",
    description: "Buy tickets, save events and manage your QR tickets.",
  },
  {
    label: "Organizer",
    description: "Created automatically when your UUID creates or owns an event.",
  },
  {
    label: "Scanner",
    description: "Granted when your UUID is added to event staff for scanning.",
  },
  {
    label: "Talent",
    description: "For artists, speakers and performers linked to a public profile.",
  },
]

function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim())
}

function getAuthCopy(mode: AuthMode) {
  if (mode === "signup") {
    return {
      submit: "Send confirmation link",
      busy: "Sending…",
      help: "We’ll send a secure confirmation link to your email and create your Ticketiv ID as an Attendee first. Organizer, Scanner and Talent access are unlocked later from UUID-linked records.",
      sent: "Check your email and click the confirmation link to finish creating your Ticketiv ID.",
      alternate: "Already have an account?",
      alternateCta: "Log in",
      alternateHref: "/sign-in",
    }
  }

  return {
    submit: "Send login link",
    busy: "Sending…",
    help: "Use the same email address linked to your Ticketiv ID. We’ll email you a secure login link.",
    sent: "Check your email and click the login link to continue to Ticketiv.",
    alternate: "New to Ticketiv?",
    alternateCta: "Create an account",
    alternateHref: "/signup",
  }
}

function getAuthCallbackUrl(redirectTo: string | null) {
  if (typeof window === "undefined") return undefined

  const callbackUrl = new URL("/auth/callback", window.location.origin)
  if (redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")) {
    callbackUrl.searchParams.set("next", redirectTo)
  }
  return callbackUrl.toString()
}

export function SignInForm({ mode = "login" }: { mode?: AuthMode }) {
  const search = useSearchParams()
  const [email, setEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const copy = getAuthCopy(mode)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSent(false)

    const normalizedEmail = email.trim().toLowerCase()
    if (!isValidEmail(normalizedEmail)) {
      setError("That email doesn't look right.")
      return
    }

    const supabase = createClient()
    const shouldCreateUser = mode === "signup"
    const redirectTo = search.get("redirectTo") || search.get("from")
    const emailRedirectTo = getAuthCallbackUrl(redirectTo)

    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser,
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    })
    setBusy(false)

    if (error) {
      setError(mode === "login" ? "We could not send a login link for that email. Create an account first, then log in." : error.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="space-y-2">
          <Label htmlFor="email-input">Email address</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email-input"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); setSent(false) }}
              required
              className="h-12 rounded-xl pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">We’ll send a secure link to your inbox.</p>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">{copy.help}</p>

        {sent && (
          <Alert className="rounded-xl border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{copy.sent}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={busy || !email} className="h-12 w-full rounded-xl" size="lg">
          {busy ? copy.busy : copy.submit} <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </form>

      {mode === "signup" && (
        <Card className="rounded-2xl bg-muted/40">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Ticketiv access roles</p>
            <div className="grid gap-2">
              {ROLE_CARDS.map((role) => (
                <div key={role.label} className="rounded-xl bg-background/80 p-3">
                  <p className="text-sm font-medium">{role.label}</p>
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {copy.alternate} <Link href={copy.alternateHref} className="font-medium text-primary underline-offset-4 hover:underline">{copy.alternateCta}</Link>
      </p>
    </div>
  )
}
