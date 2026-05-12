"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, CheckCircle2, Mail, ShieldCheck } from "lucide-react"

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
      alternateHref: "/sign-in",
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
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card/70 p-4 text-sm text-muted-foreground">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {copy.badge}
        </div>
        <ol className="grid gap-2 text-xs leading-5 sm:grid-cols-3">
          <li><span className="font-medium text-foreground">1.</span> Enter email</li>
          <li><span className="font-medium text-foreground">2.</span> Get code</li>
          <li><span className="font-medium text-foreground">3.</span> Verify ID</li>
        </ol>
      </div>

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
              onChange={(e) => { setEmail(e.target.value); setError(null) }}
              required
              className="h-12 rounded-xl pl-10"
            />
          </div>
          <p className="text-xs text-muted-foreground">We’ll send a 6-digit code to this inbox.</p>
        </div>

        <div className="space-y-2 text-xs leading-5 text-muted-foreground">
          <p>{copy.help}</p>
          <p>{copy.note}</p>
        </div>

        {mode === "signup" && (
          <Alert className="rounded-xl">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              No password needed for now. Your email becomes the first identity attached to your Ticketiv profile.
            </AlertDescription>
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
            <p className="text-sm font-semibold">What your Ticketiv ID can unlock</p>
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
